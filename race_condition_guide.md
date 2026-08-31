# Spotting Race Conditions in JS/Node LLD Designs — A Practical Guide

## Why this is genuinely hard to see (and why that's not a "you" problem)

JavaScript's single-threaded event loop creates a specific blind spot: you _know_
there's no true parallelism, so your brain quietly concludes "no threads, no
races." That conclusion is wrong, and it's wrong in a way that's easy to carry
for years without hitting it, because most CRUD code never triggers it.

The correct mental model:

> **JS has no parallelism, but it has interleaving — and interleaving is enough
> to produce every race condition bug you'd get from real threads.**

Every time your code hits `await`, control returns to the event loop, and the
event loop is free to run _any other pending callback_ before your code
resumes — including another call to the same function you're in the middle of.
Two calls to `notify()` can genuinely be "in progress" at the same time, in the
sense that matters: each has read some shared state, neither has finished
writing it back, and they're now interleaved. That's a race condition. It
doesn't need OS threads — it needs `await` plus shared mutable state.

---

## The one question that finds almost all of these bugs

Whenever you write a function that **reads** some shared piece of state, does
something asynchronous, and then **writes** that state back — stop and ask:

> **"Between the read and the write, is there an `await`? And could this
> function be called again before that `await` resolves?"**

If the answer to both is yes, you have a race condition until proven otherwise.
This single question would have caught the bug in the broker before you wrote
a line of code:

```ts
async notify() {
  let offset = this.topicSubscriber.getOffset()   // READ
  while (offset < this.topic.getLatestOffset()) {
    const message = this.topic.retrieve(offset)
    await this.messageHandler(message)             // <-- AWAIT. Anything could happen here.
    offset = offset + 1                             // WRITE (to a local var, never even
  }                                                  //        persisted — a second bug)
}
```

Two publishes close together call `notify()` twice. Call #1 reads `offset = 0`,
then awaits the handler for message 0. While it's suspended there, call #2
starts, _also_ reads `offset = 0` (call #1 hasn't written anything back yet —
and even when it does, it writes to a local variable that nothing else reads),
and now both calls are processing message 0 concurrently, and neither is aware
of the other. That's the entire bug, in one sentence: **shared cursor, read
before an await, write after — with no mechanism stopping a second call from
reading the stale value in between.**

---

## How to trace a suspected race, step by step

When you think you might have one, don't guess — trace it like a timeline.
This is the technique, not just the conclusion:

```
Time  Call A                          Call B
----  ------------------------------  ------------------------------
t0    read offset -> 0
t1    await handler(message[0])
t2                                    read offset -> 0    <-- STALE READ
t3                                    await handler(message[0])
t4    handler resolves
t5    offset = 0 + 1  (local, lost)
t6                                    handler resolves
t7                                    offset = 0 + 1  (local, lost)
```

Notice both calls process `message[0]`, neither ever processes `message[1]`
(because it's never checked before both loops decide to exit or get stuck),
and the "increment" never survives past the local scope anyway. Writing out
this kind of interleaving diagram — even quickly, even in your head — is the
single most reliable way to _prove_ a race exists rather than just suspect it.
If you can't complete the diagram (i.e., you can't articulate a concrete
interleaving that breaks something), you probably don't have a race there.

---

## The shapes this bug takes — recognize the pattern, not just this instance

The specific broker bug is one instance of a small number of recurring
shapes. Once you can name the shape, you'll spot it in code that looks
nothing like this example.

| Shape                                     | What it looks like                                                                        | Real-world example                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Read-modify-write on shared state**     | `x = x + 1` (or equivalent) split across an `await`                                       | The offset bug above; `balance -= amount` before an awaited DB write                                 |
| **Check-then-act**                        | `if (!exists) create()` where the check and the act aren't atomic                         | Two requests both see "no session exists" and both create one                                        |
| **Lazy initialization race**              | `if (!cache) cache = await expensiveInit()` called concurrently                           | Two callers both see `cache` unset and both kick off the expensive init                              |
| **Unbounded re-entrancy**                 | A function that can call itself (directly or via a loop) before a prior call has finished | Two `notify()` calls overlapping, as above                                                           |
| **Ordering assumption on concurrent I/O** | Assuming responses come back in the order requests were sent                              | Two retries for the same message racing; the _second_ attempt's response arriving before the first's |

When you're reviewing your own design, run down this table and ask "do I have
any of these shapes?" rather than trying to spot races by intuition alone.

---

## The toolkit: how to actually fix each shape

Knowing a race exists is half the skill. The other half is picking the
_right-sized_ fix — not always the fanciest one. Here's the toolkit, in
increasing order of mechanism weight, with when to reach for each:

| Technique                                                     | What it does                                                                                                  | When to use it                                                                                                                                                                         | Cost                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Re-entrancy guard (boolean flag)**                          | A simple `isRunning` flag; if already running, either drop the second call or remember to re-run after        | You just need "only one instance of this logic in flight at a time," and it's fine to re-derive fresh state on the next run (e.g., re-scan a log from a cursor)                        | Very low — one boolean, one `finally`                                   |
| **Explicit work queue per owner**                             | Instead of re-entering the function, push the new "work" into a queue; one loop drains it                     | You need to guarantee _no work is dropped or coalesced_ — every publish must be individually processed, not just "re-scan and catch up"                                                | Low-medium — an array + a drain loop                                    |
| **Mutex / semaphore**                                         | A real lock primitive; second caller `await`s until the first releases                                        | You have multiple _different_ critical sections that need mutual exclusion, or true multi-threaded/multi-process code (worker threads, multiple Node processes hitting shared storage) | Medium — usually a library (`async-mutex`, etc.)                        |
| **Optimistic concurrency (compare-and-swap / version check)** | Read a value _with_ a version/timestamp; write only succeeds if the version hasn't changed since              | Shared state lives outside your process (a DB row, a distributed cache) where you can't hold a lock across the awaited I/O anyway                                                      | Medium-high — needs DB/store support (e.g., a `version` column, `ETag`) |
| **Serialize at the source**                                   | Make the _caller_ not fire concurrently in the first place (e.g., a single-writer queue feeding the function) | You control both sides and can avoid the race by construction rather than defending against it                                                                                         | Varies                                                                  |

**For the broker**, a re-entrancy guard was the right call: `Subscription`
already re-derives its work by scanning `log` from `this.offset` on every
`drain()` call, so nothing is lost if a second `notify()` is deferred and
re-triggered later — it'll just see the fuller log next time. If instead each
publish needed _individual, guaranteed_ handling (e.g., "this exact event must
be processed even if the subscriber were mid-loop and we can't just re-scan"),
I'd have reached for an explicit queue instead. **The re-entrancy guard only
works because the underlying operation is idempotent/re-scannable** — that's
the condition to check before picking it. If your "resume point" isn't a
simple re-scannable cursor, the guard alone isn't enough.

---

## A pre-flight checklist for your own designs

Before you consider a class "done" in a machine-coding round, run this pass
over every method that touches shared state:

1. **List every piece of state that outlives a single method call** (instance
   fields, module-level variables, anything in a `Map`/array that other calls
   also touch).
2. **For each one, find every method that both reads and writes it.**
3. **For each such method, ask: does it contain an `await` (or a callback,
   `setTimeout`, promise, event emitter) between a read and the corresponding
   write?**
4. **If yes: can this method be called again — by another event, another
   publish, another timer — before the first call's write happens?** Trace
   the concrete call sites that could trigger this, don't just reason
   abstractly.
5. **If yes: pick a mechanism from the toolkit above**, and be able to say in
   one sentence _why that one_ and not a heavier one.

Step 4 is where people usually stop too early — they see the `await` and
correctly flag "this _could_ be a race" but don't finish tracing whether
anything realistic actually triggers the second call. Both halves matter: an
`await` alone isn't a bug if nothing else could ever call the function again
before it resolves (e.g., a one-shot startup routine). It's the _combination_
of "state survives across an await" _and_ "a plausible second caller exists"
that makes it real.

---

## Drills to build the reflex (do these on code you already trust)

The fastest way to internalize this is to go looking for it deliberately in
code you've already written and assumed was fine:

- **Go back to your rate limiter.** Does any bucket/window implementation read
  a count, do something async (even a `Promise.resolve()` microtask), then
  write the count back? Two concurrent requests hitting the same key would
  expose it.
- **Go back to the ATM design.** Does a withdrawal read the balance, `await`
  anything (a "network call" simulation, a state transition), then write the
  new balance? Two concurrent withdrawal requests on the same account is the
  classic version of this bug in the wild — it's a very common real interview
  follow-up question for exactly that reason.
- **For any new LLD problem going forward**, before writing the "happy path"
  implementation, explicitly write out — even just as a comment — the list
  from the checklist above ("shared state: X, Y. Methods touching both read
  and write: A, B. Await between them? A: yes. B: no."). Doing this
  _before_ coding, not after, is what turns this into a design habit instead
  of a debugging habit.

---

## How to talk about this in an interview

This is a high-leverage thing to narrate out loud, unprompted, because most
candidates never mention concurrency unless directly asked — so bringing it up
proactively is a strong differentiator. A good version sounds like:

> "This method reads the subscriber's offset, awaits the handler, then
> advances the offset. If two publishes happen close together, this could be
> called again before the first call's `await` resolves, which would mean two
> concurrent reads of the same stale offset. I'm guarding against that with an
> `isProcessing` flag rather than a full lock, because the underlying work is
> just a re-scannable cursor over the log — nothing is lost if I defer and
> re-run rather than truly serialize every call."

Notice the structure: **name the shared state → trace the concrete
interleaving → name the mechanism you chose → justify why that mechanism and
not a heavier one.** That four-part structure is reusable for any concurrency
question you get, in this problem or a completely different one.
