# Machine Coding Round: Build a Mini RabbitMQ

## Problem Statement

Design and implement an **in-memory message broker** similar to a simplified RabbitMQ.

The system should allow producers to publish messages to topics and consumers to subscribe to topics and receive messages asynchronously.

The solution should demonstrate:

- Clean object-oriented design
- Separation of concerns
- SOLID principles
- Extensibility
- Testability
- Proper handling of asynchronous message processing, acknowledgement, retries, and dead-letter queues

The implementation should be written in **TypeScript**.

---

# Requirements

## 1. Topic Management

The broker should support creation of topics.

Example:

```ts
broker.createTopic("orders");
broker.createTopic("payments");
```

### Rules

- Topic names must be unique.
- Creating an already existing topic should fail.
- Publishing or subscribing to a non-existent topic should fail.

---

## 2. Publish Messages

A producer should be able to publish a message to a topic.

Example:

```ts
await broker.publish("orders", {
  orderId: "ORD-123",
  amount: 1000,
});
```

Every published message should receive a unique message ID.

Conceptually, a message may look like:

```ts
interface Message<T> {
  id: string;
  payload: T;
  createdAt: number;
}
```

### Publish Semantics

`publish()` should:

1. Create/enqueue the message.
2. Identify all active subscribers of the topic.
3. Trigger asynchronous delivery.
4. Return without waiting for consumers to finish processing.

The `publish()` operation should **not** wait for retries, acknowledgements, or DLQ processing.

---

# 3. Subscribe Consumers

Consumers should be able to subscribe to a topic.

Example:

```ts
broker.subscribe("orders", "email-service", async (message) => {
  console.log(message.payload);
  await message.ack();
});
```

A subscription consists of:

- Topic
- Consumer ID
- Message handler

Example:

```ts
type MessageHandler<T> = (message: MessageDelivery<T>) => Promise<void>;
```

A consumer ID must uniquely identify an active subscription within a topic.

A consumer cannot have multiple active subscriptions to the same topic.

---

# 4. Unsubscribe Consumers

Consumers should be able to unsubscribe.

Example:

```ts
broker.unsubscribe("orders", "email-service");
```

After unsubscribing:

- The consumer should not receive newly published messages.
- Existing in-flight deliveries may finish processing.

The exact API design is left to the candidate.

---

# 5. Message Delivery

Every active subscriber of a topic should receive every message published to that topic.

Example:

```text
Topic: orders

Subscribers:
- email-service
- analytics-service
- inventory-service
```

When a message is published:

```text
orders
   |
   +----> email-service
   |
   +----> analytics-service
   |
   +----> inventory-service
```

All three consumers should independently receive the message.

### Important Delivery Rule

**Each message/subscriber combination represents an independent delivery.**

For example:

```text
Message M1

email-service
    -> ACK

analytics-service
    -> ACK

inventory-service
    -> FAIL
    -> RETRY
    -> RETRY
    -> DLQ
```

A failure or DLQ transition for one consumer **must not affect delivery or acknowledgement state for other consumers**.

---

# 6. Asynchronous Processing

Consumer handlers should be executed asynchronously.

A slow or failed consumer should not block other consumers from receiving the same message.

For example:

```text
publish(M1)

        |
        +----> email-service
        |
        +----> analytics-service
        |
        +----> inventory-service
```

The implementation should not require:

```text
email completes
    ↓
analytics starts
    ↓
inventory starts
```

Concurrent delivery is preferred.

---

# 7. Message Acknowledgement

A message delivery is considered successfully processed only after the consumer explicitly acknowledges it.

Example:

```ts
broker.subscribe("orders", "email-service", async (delivery) => {
  console.log(delivery.message.payload);

  await delivery.ack();
});
```

A possible delivery abstraction is:

```ts
interface MessageDelivery<T> {
  message: Message<T>;

  ack(): Promise<void>;
}
```

The exact API is left to the candidate.

### Important Rules

- Calling `ack()` marks the current delivery as successfully processed.
- Acknowledgement state is maintained independently for each subscriber.
- A consumer must explicitly acknowledge a successful delivery.
- A handler that throws/rejects is considered a failed delivery attempt.
- If a handler completes without acknowledging the message, the behavior should be treated as a failed delivery attempt.

---

# 8. Retry Failed Messages

If message processing fails, the broker should retry delivery.

The retry mechanism should support a configurable maximum number of attempts.

Example:

```text
maxAttempts = 3

Attempt 1 -> Failed
Attempt 2 -> Failed
Attempt 3 -> Failed
Move to DLQ
```

### Retry Rules

- The retry count is maintained independently for each message/subscriber pair.
- The initial delivery counts as the first attempt.
- `maxAttempts` includes the initial attempt.
- A successful acknowledgement stops further retries.
- A failed delivery is retried until `maxAttempts` is reached.
- After the final failed attempt, the delivery should be moved to the topic's DLQ.
- The base implementation may perform retries immediately.

Example:

```ts
broker.createTopic("orders");

broker.configureRetryPolicy("orders", {
  maxAttempts: 3,
});
```

The exact configuration API is left to the candidate.

---

# 9. Retry Strategy

The retry mechanism should be designed for extensibility.

The base implementation only needs to support **immediate retries**.

However, the design should make it possible to add strategies such as:

```text
Immediate Retry
Fixed Delay
Exponential Backoff
```

For example:

```ts
interface RetryPolicy {
  shouldRetry(attempt: number): boolean;

  getDelay(attempt: number): number;
}
```

This is an important design consideration, but candidates do not need to implement delayed retries in the base solution.

---

# 10. Dead Letter Queue (DLQ)

Messages that exceed the maximum number of delivery attempts should be moved to a Dead Letter Queue.

The broker should expose a way to inspect the DLQ.

Example:

```ts
broker.getDLQ("orders");
```

The DLQ should be maintained **per topic**.

A DLQ entry should retain enough information to understand why the message was dead-lettered.

For example:

```ts
interface DeadLetterMessage<T> {
  message: Message<T>;
  topic: string;
  consumerId: string;
  attempts: number;
  lastError?: Error;
}
```

The exact design is left to the candidate.

### Important Rule

A message should enter the DLQ for a specific consumer delivery.

For example:

```text
Message M1

email-service
    -> ACK

inventory-service
    -> FAIL
    -> FAIL
    -> FAIL
    -> DLQ
```

The successfully processed email delivery must not be moved to the DLQ.

---

# 11. Error Handling

The broker should handle at least the following cases:

```text
Create existing topic
Publish to non-existent topic
Subscribe to non-existent topic
Duplicate consumer subscription
Unsubscribe unknown consumer
Consumer handler failure
Message acknowledgement failure
```

The implementation should use appropriate errors and should not silently hide invalid operations.

---

# 12. Core Delivery Invariant

The most important invariant of the system is:

> **Every published message must create an independent delivery for every active subscriber of the topic. Each delivery has its own acknowledgement state, retry count, and eventual DLQ state.**

For example:

```text
Message: ORD-123

             +------------------+
             |   orders topic   |
             +------------------+
                /       |       \
               /        |        \
              v         v         v
         email       analytics   inventory
           |             |           |
          ACK           ACK        FAIL
                                    |
                                  retry
                                    |
                                  retry
                                    |
                                  DLQ
```

---

# Functional Expectations

The following flow should work:

```ts
broker.createTopic("orders");

broker.subscribe("orders", "email-service", async (delivery) => {
  console.log("Email:", delivery.message.payload);

  await delivery.ack();
});

broker.subscribe("orders", "analytics-service", async (delivery) => {
  console.log("Analytics:", delivery.message.payload);

  await delivery.ack();
});

await broker.publish("orders", {
  orderId: "123",
  amount: 100,
});
```

Expected output:

```text
Email: { orderId: "123", amount: 100 }
Analytics: { orderId: "123", amount: 100 }
```

The order in which the consumers print their messages is not guaranteed.

---

# Example Scenario: Failed Consumer

```ts
broker.createTopic("orders");

broker.subscribe("orders", "email-service", async (delivery) => {
  console.log("Email Sent");

  await delivery.ack();
});

broker.subscribe("orders", "inventory-service", async (delivery) => {
  throw new Error("Inventory service unavailable");
});

await broker.publish("orders", {
  orderId: "ORD-001",
});
```

Assume:

```text
maxAttempts = 3
```

Expected behavior:

```text
Email Sent

Inventory Service Failed - Attempt 1
Inventory Service Failed - Attempt 2
Inventory Service Failed - Attempt 3

Inventory delivery moved to DLQ
```

The email consumer should receive the message exactly once and should not be affected by the inventory consumer's failures.

The DLQ should contain the failed inventory delivery, not the entire message globally.

---

# Suggested High-Level API

The following API is illustrative only. Candidates are free to modify it based on their design.

```ts
interface Message<T> {
  id: string;
  payload: T;
  createdAt: number;
}

interface MessageDelivery<T> {
  message: Message<T>;

  ack(): Promise<void>;
}

type MessageHandler<T> = (delivery: MessageDelivery<T>) => Promise<void>;

interface RetryPolicy {
  shouldRetry(attempt: number): boolean;
  getDelay(attempt: number): number;
}

class MessageBroker {
  createTopic(name: string): void;

  publish<T>(topic: string, payload: T): Promise<void>;

  subscribe<T>(
    topic: string,
    consumerId: string,
    handler: MessageHandler<T>,
  ): Subscription;

  unsubscribe(topic: string, consumerId: string): void;

  getDLQ<T>(topic: string): DeadLetterMessage<T>[];
}
```

The candidate is **not required to follow this exact API**.

The quality of the object model and separation of responsibilities is more important than matching these method signatures.

---

# Constraints

- The system should be completely in-memory.
- No database persistence is required.
- Single-process implementation is sufficient.
- Use TypeScript.
- Use classes/interfaces where appropriate.
- Do not use external messaging/broker libraries.
- No networking is required.
- No distributed-system implementation is required.
- Focus on clean design rather than framework-specific code.
- Thread safety across multiple processes is not required.
- Exactly-once delivery is **not required**.
- FIFO ordering is **not required** for the base implementation.

---

# Evaluation Criteria

## 1. Design

Evaluate:

- SOLID principles
- Separation of concerns
- Encapsulation
- Appropriate use of interfaces
- Dependency inversion
- Extensibility
- Object-oriented design
- Clear ownership of message/delivery state

A good implementation should avoid putting all logic inside a single `MessageBroker` class.

---

## 2. Code Quality

Evaluate:

- Readability
- Naming conventions
- Type safety
- Error handling
- Appropriate abstractions
- Testability
- Avoidance of unnecessary complexity

---

## 3. Functionality

Evaluate:

- Topic creation
- Message publishing
- Subscription
- Unsubscription
- Message delivery
- Independent consumer acknowledgement
- Retry handling
- Per-consumer retry tracking
- DLQ support
- Error handling
- Asynchronous processing

---

# Bonus / Advanced Extensions

These are optional and should not be required for the base implementation.

## 1. Delayed Retries

Support:

```text
Attempt 1
    ↓
wait 1 second
    ↓
Attempt 2
    ↓
wait 2 seconds
    ↓
Attempt 3
```

---

## 2. Exponential Backoff

Support configurable retry strategies such as:

```text
1s
2s
4s
8s
```

---

## 3. FIFO Ordering

Guarantee FIFO ordering for messages published to a topic.

The candidate should explain the trade-offs introduced by this requirement.

---

## 4. Consumer Groups

Support consumer groups where:

```text
Topic: orders

Group: payment-service
    ├── consumer-1
    ├── consumer-2
    └── consumer-3
```

Each message should be delivered to **one consumer within the group**, while different consumer groups should independently receive the message.

This changes the delivery model from:

```text
Every subscriber gets every message
```

to:

```text
Every consumer group gets every message,
but only one consumer within each group processes it.
```

---

## 5. Metrics

Expose basic metrics such as:

```text
Messages published
Messages successfully processed
Failed deliveries
Retry count
DLQ count
Messages currently in-flight
```

---

## 6. Idempotency Discussion

Discuss how the system behaves if:

```text
Consumer processes message successfully
        ↓
Consumer crashes before ACK
        ↓
Broker retries message
        ↓
Consumer processes message again
```

Exactly-once processing is **not required**.

The candidate should be able to explain how consumers could make processing idempotent.

---

# Testing Expectations

Unit tests are preferred.

At minimum, tests should cover:

### Topic Management

```text
Create topic
Create duplicate topic
Publish to unknown topic
Subscribe to unknown topic
```

### Message Delivery

```text
One subscriber receives message
Multiple subscribers receive message
Unsubscribed consumer does not receive new messages
```

### Acknowledgement

```text
Successful handler + ACK
Handler failure
Handler completes without ACK
```

### Retry

```text
Failed delivery is retried
Successful ACK stops retries
Retry count is tracked independently per consumer
```

### DLQ

```text
Message moves to DLQ after max attempts
Only failed consumer delivery moves to DLQ
Successful consumers are unaffected
DLQ contains failure metadata
```

---

# Deliverables

Implement the solution along with:

1. Main classes/interfaces
2. Demonstration code
3. Unit tests
4. Short explanation of the design and major trade-offs

The implementation is more important than the documentation.

---

# Out of Scope

The following are explicitly out of scope for the base implementation:

- Persistence
- Networking
- Authentication/authorization
- Distributed brokers
- Multiple broker nodes
- Leader election
- Replication
- Network partitions
- Exactly-once delivery
- Production-grade durability
- Horizontal scaling

---

# Time Limit

**60–90 minutes**

Prioritize:

1. Correctness
2. Clean object-oriented design
3. Separation of responsibilities
4. Testability
5. Extensibility

Do not spend significant time implementing optional optimizations.

A simple, well-designed solution is preferred over a complex solution with more features.
