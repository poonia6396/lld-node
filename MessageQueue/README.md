# Machine Coding Round: Build a Mini RabbitMQ

## Problem Statement

Design and implement an in-memory message broker similar to RabbitMQ.

The system should allow producers to publish messages to topics and consumers to subscribe to topics to receive messages asynchronously.

Your solution should be designed with extensibility, clean object-oriented design, and maintainability in mind.

---

## Requirements

### 1. Topic Management

The broker should support creation of topics.

Example:

```ts
broker.createTopic("orders");
broker.createTopic("payments");
```

---

### 2. Publish Messages

A producer should be able to publish messages to a topic.

Example:

```ts
broker.publish("orders", {
    orderId: "ORD-123",
    amount: 1000
});
```

---

### 3. Subscribe Consumers

Consumers should be able to subscribe to a topic.

Example:

```ts
broker.subscribe(
    "orders",
    "email-service",
    async (message) => {
        console.log(message.payload);
    }
);
```

---

### 4. Message Delivery

Every subscriber of a topic should receive every message published to that topic.

Example:

```
Topic: orders

Subscribers:
- email-service
- analytics-service
- inventory-service
```

When a message is published to `orders`, all three subscribers should receive it.

---

### 5. Message Acknowledgement

A message should be considered successfully processed only after the consumer explicitly acknowledges it.

Example:

```ts
await message.ack();
```

---

### 6. Retry Failed Messages

If message processing fails, the system should retry delivery.

Requirements:

- Configurable maximum retry count.
- Retry count should be tracked per message.

Example:

```
Max Retries = 3

Attempt 1 -> Failed
Attempt 2 -> Failed
Attempt 3 -> Failed

Move to DLQ
```

---

### 7. Dead Letter Queue (DLQ)

Messages that exceed the maximum retry count should be moved to a Dead Letter Queue.

Example:

```ts
broker.getDLQ("orders");
```

---

## Functional Expectations

The following flow should work:

```ts
broker.createTopic("orders");

broker.subscribe(
    "orders",
    "email-service",
    async (message) => {
        console.log("Email:", message.payload);
        await message.ack();
    }
);

broker.subscribe(
    "orders",
    "analytics-service",
    async (message) => {
        console.log("Analytics:", message.payload);
        await message.ack();
    }
);

broker.publish("orders", {
    orderId: "123",
    amount: 100
});
```

Expected Output:

```
Email: { orderId: "123", amount: 100 }

Analytics: { orderId: "123", amount: 100 }
```

---

## Constraints

- The system should be completely in-memory.
- No database persistence is required.
- Single-process implementation is sufficient.
- Focus on clean design rather than framework-specific code.
- Use TypeScript.
- Use classes/interfaces where appropriate.
- Avoid using external messaging libraries.

---

## Evaluation Criteria

You will be evaluated on:

### Design

- SOLID principles
- Separation of concerns
- Extensibility
- Object-oriented design

### Code Quality

- Readability
- Naming conventions
- Error handling
- Testability

### Functionality

- Correct message delivery
- Retry handling
- DLQ support
- Acknowledgement flow

### Bonus

- Concurrent message processing
- Delayed retries
- FIFO ordering guarantees
- Consumer groups
- Metrics collection

---

## Deliverables

Implement the solution along with:

1. Main classes/interfaces
2. Demonstration code
3. Unit tests (optional but preferred)

---

## Example Scenario

```ts
broker.createTopic("orders");

broker.subscribe(
    "orders",
    "email-service",
    async (message) => {
        console.log("Email Sent");
        await message.ack();
    }
);

broker.subscribe(
    "orders",
    "inventory-service",
    async (message) => {
        throw new Error("Inventory service unavailable");
    }
);

broker.publish("orders", {
    orderId: "ORD-001"
});
```

Expected Behaviour:

```
Email Sent

Inventory Service Failed
Retry #1

Inventory Service Failed
Retry #2

Inventory Service Failed
Retry #3

Moved to DLQ
```

---

## Time Limit

60–90 minutes

Focus on building a clean, extensible solution rather than implementing every possible optimization.