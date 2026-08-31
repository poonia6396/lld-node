# LLD Machine Coding Rounds in Node.js/TypeScript — A Practical Guide

## 0. What's actually being evaluated (read this before anything else)

Every rubric you'll see (including the one on your own mini-RabbitMQ
practice question) says roughly the same four things: **design, code
quality, functionality, bonus**. But in a 60-90 minute round, the *actual*
differentiator between a mid-level and senior-level signal is almost never
"did you implement every bonus feature." It's:

1. **Did you correctly identify what varies and what doesn't**, and only
   add abstraction where something genuinely varies (Strategy interfaces,
   pluggable policies) — not everywhere.
2. **Did you notice and handle concurrency/ordering issues without being
   asked** — most candidates never mention this unless prompted.
3. **Did you narrate trade-offs instead of presenting one answer as the
   only answer** — ordering guarantees, retry semantics, backpressure.
4. **Did you produce something that actually runs**, not code that looks
   plausible but has a bug you'd have caught by tracing one interleaving.

Everything below is organized to build these four things deliberately,
not to help you "finish fast."

---

## 1. Time-boxing a 60-90 minute round

A structure that leaves room for the parts most candidates skip under
pressure (testing, narrating trade-offs):

| Phase | Time (60 min) | Time (90 min) | Goal |
|---|---|---|---|
| Clarify scope | 5 min | 8 min | Narrow the problem before writing code |
| Identify state & actors | 5 min | 8 min | Find the nouns that change over time |
| Sketch class boundaries (out loud/on paper) | 5 min | 7 min | Decide ownership before typing |
| Core implementation | 30 min | 40 min | Happy path + the one or two hard mechanisms |
| Concurrency pass | 5 min | 10 min | Re-read for shared-state races, deliberately |
| Tests / demo | 5 min | 10 min | Prove it runs, not just compiles |
| Narrate trade-offs + bonus | 5 min | 7 min | Say out loud what you'd do with more time |

The single biggest time-management mistake: skipping straight from
"clarify scope" to "core implementation" and never doing an explicit
class-boundary pass. Five minutes of deciding "what owns what" before
typing saves you from a mid-implementation restructure, which costs far
more than five minutes.

---

## 2. Phase 1 — Clarifying scope (5-8 min)

Most LLD prompts are deliberately underspecified — that's part of the
test. Don't silently assume; **state your assumption out loud and move
on**, in one sentence each:

- What's the concurrency model? ("I'll assume single-process, in-memory,
  but I'll design the ownership boundaries so this could be sharded
  later.")
- What's the failure/retry semantics if not specified? ("I'll assume
  at-least-once delivery unless told otherwise — that's the harder and
  more realistic case.")
- What's explicitly out of scope? ("I won't implement persistence /
  distributed coordination / auth unless you want me to — I'll note where
  I'd add it.")

This phase is also where you decide **what NOT to build** — a common trap
is trying to satisfy every line of the "Bonus" section instead of nailing
the core requirements with a clean design. State the prioritization out
loud: "I'll get the core flow rock-solid first, then pick one bonus item
if time allows."

---

## 3. Phase 2 — Find the state before you find the classes

This is the single highest-leverage habit from this whole series of
practice problems, so it's worth restating as the concrete procedure:

> **List every piece of information that must be remembered across
> multiple method calls.** For each one, ask: "who needs to remember
> this, and does it change independently of everything else?"

Two things that change independently belong to two different owners.
Two things that always change together probably belong to the same
owner. This single exercise (which you can do in your head or literally
as a bullet list before coding) determines almost the entire class
structure before you write a line of implementation.

**Worked example from the broker**: message log (shared, append-only),
per-subscriber cursor (independent per subscriber), per-subscriber retry
counts (independent per subscriber, and per message within that). Three
different change-timelines → `Topic` owns the first, `Subscription` owns
the second and third together (since they always change in lockstep for
a given subscriber).

---

## 4. Phase 3 — Deciding class boundaries: two tests, not intuition

Once you have the state list, use these two tests — not gut feel — to
decide what becomes its own class:

**Test A — State ownership**: does this chunk of state have its own
change-timeline, independent of other state? If yes, it's a class
(or at least a clearly separated data structure with its own accessor
methods) — don't let one class silently mutate state that conceptually
belongs to another.

**Test B — Axis of variation**: is there a plausible second
implementation of this specific piece of behavior that a reasonable
interviewer/PM could ask for in the next five minutes? If yes, extract an
interface (Strategy pattern) *before* being asked. If no — if you can't
name a concrete alternate implementation — don't extract an interface for
it. Speculative abstraction ("just in case") reads as noise, not rigor.

**A one-sentence test for whether you've over- or under-extracted a
class**: can you describe its job with no "and" in the sentence? "This
class tracks a subscriber's offset **and** its retry counts **and**
decides ack-timeout behavior" is one class doing three jobs — that's your
signal to split before you've written much code, not after.

---

## 5. Pattern selection cheat sheet

Don't reach for a pattern because the problem "sounds like" it needs one
— reach for it because Test B above fires. This table maps common LLD
signals to the pattern they usually indicate, with the trigger condition
that justifies it (not just the vibe):

| Pattern | Use when... | Trigger phrase in the prompt | Example from your practice |
|---|---|---|---|
| **Strategy** | A specific piece of logic has more than one plausible implementation, chosen at runtime or config time | "configurable," "pluggable," "different algorithms," a bonus item listing variants | Retry backoff (`RetryPolicy`), rate limiter algorithm (Token Bucket vs. Sliding Window) |
| **State** | An entity's *allowed behavior* changes based on which of a fixed set of states it's in, and invalid transitions should be rejected | A lifecycle with named stages, "cannot X while in Y state" | ATM (idle/card-inserted/pin-entered), JIT access agent (REQUESTED→PROVISIONED→ACTIVE→EXPIRED) |
| **Observer** | Multiple independent parties need to react to the same event, without the publisher knowing who they are | "subscribe," "notify," "listeners," any pub-sub prompt | The whole broker's subscribe/publish core |
| **Facade** | You want one simple public entry point hiding a more complex internal object graph | The prompt gives you a short list of top-level API calls (`broker.publish(...)`) | `MessageBroker`, ATM's outer class |
| **Decorator** | You need to layer optional, composable behavior onto something without subclassing explosion | "add logging/retry/caching to X without changing X" | Wrapping a handler with retry+timeout behavior (what `Delivery` effectively does, without formally naming it a Decorator) |
| **Factory** | Object creation itself has branching logic that would otherwise leak into calling code | "create the right type of X based on input" | Choosing which `RetryPolicy` to instantiate based on config |

**The trap to avoid**: naming a pattern before checking the trigger
condition. If you can't point to the specific requirement that demands a
second implementation, don't build the interface — plain code you can
extend later beats a premature interface with exactly one implementation.

---

## 6. Node/TypeScript-specific implementation checklist

These are concrete bugs that show up disproportionately often in
Node/TS machine coding rounds, several of which you've hit firsthand —
worth running through deliberately, not just "being careful":

- [ ] **Never wrap an already-async operation in `new Promise((resolve,
      reject) => { ... await ... })`.** The executor function isn't
      `async` — this won't compile, and it's an anti-pattern even when it
      does (you almost never need to construct a `Promise` manually
      around something that's already awaitable). If you catch yourself
      doing this, the fix is almost always "just make the outer function
      `async` and `return`/`throw` directly."
- [ ] **Fire-and-forget async calls need an explicit `.catch()` or
      `void` + error boundary.** `someAsyncFn()` without `await` or
      `.catch()` produces an unhandled rejection if it throws — silent in
      some setups, a crash in others. If you're intentionally not
      awaiting (e.g., processing multiple subscribers concurrently),
      say so out loud and attach `.catch()`.
- [ ] **Arrow functions vs. methods when handing out a callback.** If a
      method reference (`this.ack`) is extracted and called detached from
      its object (`const fn = obj.ack; fn()`), a regular method loses its
      `this` binding. Use a class field arrow function
      (`ack = () => {...}`) for anything you hand to external code as a
      bare reference.
- [ ] **`await` only yields at real async boundaries.** A long
      synchronous loop inside an `async` function still blocks the
      entire event loop — no partial yielding happens mid-loop. If your
      design has CPU-bound work, say explicitly whether you'd offload it
      to `worker_threads` and why.
- [ ] **Distinguish "the handler's promise resolved" from "the operation
      succeeded."** If your problem has explicit ack/commit semantics
      (job done, message acked, transaction committed), don't conflate a
      resolved promise with success — they can be different signals that
      need to race or be tracked separately (see the `Delivery` class's
      ack-vs-resolve distinction).
- [ ] **`Map`/array index access with `noUncheckedIndexedAccess`
      (strict TS) returns `T | undefined`.** Don't assume a lookup by ID
      or index always succeeds — handle the `undefined` case explicitly
      rather than silencing it with a non-null assertion (`!`) unless
      you can justify why it's genuinely impossible there.
- [ ] **Re-entrancy on any method that's triggered by an external event
      and mutates shared state.** Explicitly ask: "can this method be
      called again before its previous invocation's `await` resolves?"
      for every event-triggered handler. (Full checklist:
      the race-conditions guide from this series.)

---

## 7. Concurrency pass — do this as an explicit, separate step

Don't fold this into "writing the code" — do it as a deliberate re-read
pass after the happy path works, because it's the thing candidates most
reliably forget under time pressure. Two questions, run against every
method that touches state living outside its own local scope:

1. **Is there an `await` between a read and a write of shared state?**
2. **Could this method realistically be invoked again before that
   `await` resolves — by another event, timer, or concurrent request?**

If yes to both: pick the *lightest* mechanism that fixes it (re-entrancy
guard → explicit queue → real lock/mutex → optimistic concurrency,
roughly in order of increasing weight), and be ready to justify why you
didn't reach for a heavier one. See the dedicated concurrency guide from
this series for the full toolkit and worked trace-through examples.

---

## 8. Testing under time pressure — what's worth writing, what isn't

You will not have time for exhaustive test coverage. Prioritize tests
that **prove the hard mechanism works**, not tests that restate the
happy path you already eyeballed:

**Worth writing** (in priority order):
1. The core flow end-to-end (does it actually run — many candidates
   never execute their own code)
2. The retry/failure/edge-case path — this is where bugs actually hide
3. The concurrency scenario you identified in Phase 7 (two concurrent
   calls, does ordering/isolation hold)
4. One test for an explicitly-stated constraint (e.g., "max concurrency
   of 3" — assert that a 4th never starts before one finishes)

**Not worth your time in a 60-90 min round**: 100% branch coverage,
testing framework setup (plain `assert` + a manual runner is fine and
demonstrates the same rigor faster), testing trivial getters.

---

## 9. What to actually say out loud (the differentiator)

Silence is the most common way strong engineers under-perform in these
rounds — not lack of skill, lack of narration. A short, reusable
structure for any design decision, in this order:

1. **Name the ambiguity or trade-off** ("ordering could be strict
   per-subscriber or best-effort — I'm picking strict").
2. **State which you chose and why** ("...because the spec's retry
   example implies per-subscriber ordering matters more than raw
   throughput here").
3. **Name the cost of that choice** ("...the cost is a slow subscriber
   can stall its own backlog until it's retried or DLQ'd").
4. **Say what you'd change if the constraint were different** ("if
   throughput mattered more, I'd skip-ahead past a stuck message instead").

This exact four-part structure works for ordering guarantees, retry
semantics, ack timeouts, consistency-vs-availability calls, and
concurrency mechanism choice — it's the same shape every time.

---

## 10. Common LLD archetypes and their default shape

A quick-reference map so you're not starting from zero on pattern
selection for whatever problem you draw:

| Archetype | Core state to identify | Likely patterns | Known hard part |
|---|---|---|---|
| **Pub-sub / message broker** | shared log + per-subscriber cursor | Observer, Strategy (retry) | Concurrency (claim/cursor races), ordering guarantees |
| **Rate limiter** | request timestamps or token count per key | Strategy (algorithm) | Concurrent requests hitting the same key atomically |
| **Job queue / worker pool** | pending queue + in-flight set + worker availability | Strategy (retry), Factory (worker creation) | Claim races across multiple workers (harder than single-drainer re-entrancy) |
| **LRU/LFU cache** | key→value map + access-order structure (linked list/heap) | Decorator (eviction policy as pluggable) | Concurrent get/set during eviction; lazy-init race on cache miss |
| **Elevator / parking lot** | per-unit (elevator/spot) current state + request queue | State (elevator state machine), Strategy (dispatch algorithm) | Fairness/starvation in the dispatch algorithm, not usually concurrency |
| **ATM / vending machine** | machine's current state + transaction in progress | State, Strategy (payment/dispense methods), Facade | Illegal-transition rejection, not concurrency (usually single-user) |
| **Chat/notification system** | per-user delivery status + presence | Observer, Strategy (delivery channel) | Offline delivery/replay semantics, ordering across multiple devices |

---

## 11. Final pre-submission checklist

Run this in the last 2-3 minutes, out loud if it's a live round:

- [ ] Does the happy-path demo actually execute and print the expected
      output (not just typecheck)?
- [ ] Did I handle the one or two failure/edge cases the prompt
      explicitly called out (not just the happy path)?
- [ ] Is there at least one method where shared state crosses an
      `await`, and did I address or explicitly flag the concurrency
      risk there?
- [ ] Can I name, for each class I created, the one job it does with no
      "and" in the sentence?
- [ ] Can I name, for each interface/Strategy I introduced, the second
      concrete implementation that justifies it existing?
- [ ] Have I said at least one trade-off out loud using the four-part
      structure from §9, rather than presenting my design as the only
      possible one?

---

## 12. The meta-lesson to carry forward

Every piece of this guide reduces to the same underlying discipline:
**identify what changes and how before you decide what to build**, and
**say the ambiguous parts out loud instead of silently picking one
answer**. Everything else — which pattern, which concurrency primitive,
how many classes — falls out of that discipline rather than needing to
be memorized per-problem. That's also exactly why the archetype table in
§10 is a starting hypothesis to verify against the specific prompt's
requirements, not a lookup table to trust blindly — the same caution
that applied to the drain-loop pattern generalizing to pub-sub applies to
every row in that table too.
