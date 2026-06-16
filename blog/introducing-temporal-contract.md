---
title: "Introducing temporal-contract: Type-Safe Temporal.io Workflows for TypeScript"
description: "End-to-end type safety and automatic validation for Temporal workflows and activities"
date: 2024-12-21
author: Benoit TRAVERS
tags: [typescript, temporal, workflows, type-safety, orchestration]
---

# Introducing temporal-contract: Type-Safe Temporal.io Workflows for TypeScript

If you've worked with [Temporal.io](https://temporal.io) for building durable workflows in TypeScript, you know how powerful it is for orchestrating complex business processes. However, maintaining type safety between workflow definitions, activity implementations, and client code can be challenging. Today, I'm excited to introduce **temporal-contract** — a library that brings end-to-end type safety to Temporal workflows with automatic validation and excellent developer experience.

## The Problem with Traditional Temporal Development

Temporal is an incredible platform for building reliable, fault-tolerant distributed systems. But the traditional TypeScript approach has some pain points:

```typescript
// ❌ Traditional approach: Manual type coordination
import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";

const { processPayment, sendEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
});

export async function orderWorkflow(orderId: string): Promise<void> {
  // What's the expected structure? No validation!
  await processPayment(orderId);
  await sendEmail(orderId);
}

// Activities file - easy to drift from workflow expectations
export async function processPayment(orderId: string): Promise<void> {
  // Implementation
}
```

**Problems:**

- 🚫 No runtime validation of inputs/outputs
- 🚫 Manual type coordination between files
- 🚫 Easy to drift when refactoring
- 🚫 No centralized contract definition
- 🚫 Complex error handling without Result types
- 🚫 Difficult to ensure consistency across teams

## Introducing temporal-contract

**temporal-contract** solves these problems with a contract-first approach. You define your workflows, activities, and their schemas once using [Zod](https://github.com/colinhacks/zod), and type safety flows throughout your application — from client to worker.

### Key Features

✅ **End-to-end type safety** — Full TypeScript inference from contract to client, workflows, and activities
✅ **Automatic validation** — Zod schema validation at all network boundaries
✅ **Compile-time checks** — Catch errors before runtime
✅ **Result/Future pattern** — Explicit error handling for activities and child workflows with [@swan-io/boxed](https://github.com/swan-io/boxed)
✅ **Child workflows** — Type-safe child workflow execution
✅ **NestJS integration** — First-class support for dependency injection
✅ **Better DX** — Full autocomplete, inline documentation, and refactoring support

## How It Works

### Step 1: Define Your Contract

First, define your Temporal contract with workflows and activities in one place:

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

// Define contract once with full type safety
export const orderContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        customerId: z.string(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            price: z.number().positive(),
          }),
        ),
      }),
      output: z.object({
        success: z.boolean(),
        orderId: z.string(),
        totalAmount: z.number(),
      }),
      activities: {
        validateInventory: {
          input: z.object({
            items: z.array(
              z.object({
                productId: z.string(),
                quantity: z.number(),
              }),
            ),
          }),
          output: z.object({
            available: z.boolean(),
            unavailableItems: z.array(z.string()),
          }),
        },
        processPayment: {
          input: z.object({
            customerId: z.string(),
            amount: z.number().positive(),
          }),
          output: z.object({
            transactionId: z.string(),
            status: z.enum(["success", "failed", "pending"]),
          }),
        },
        sendConfirmationEmail: {
          input: z.object({
            customerId: z.string(),
            orderId: z.string(),
          }),
          output: z.object({
            sent: z.boolean(),
          }),
        },
      },
    },
  },
});
```

### Step 2: Implement Type-Safe Activities

Activities use the `declareActivitiesHandler` function and return `Future` objects from [@swan-io/boxed](https://github.com/swan-io/boxed) for explicit error handling:

```typescript
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";
import { orderContract } from "./contract";
import { Future } from "@swan-io/boxed";

// ✅ Activities are fully typed! TypeScript knows the input/output types
export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    validateInventory: ({ items }) => {
      // input.items is typed!
      return Future.fromPromise(
        (async () => {
          const unavailable: string[] = [];

          for (const item of items) {
            const inStock = await checkInventory(item.productId, item.quantity);
            if (!inStock) {
              unavailable.push(item.productId);
            }
          }

          return {
            available: unavailable.length === 0,
            unavailableItems: unavailable,
          };
        })(),
      ).mapError(
        (error) =>
          new ActivityError(
            "INVENTORY_CHECK_FAILED",
            error instanceof Error ? error.message : "Failed to check inventory",
            error,
          ),
      );
    },

    processPayment: ({ customerId, amount }) => {
      return Future.fromPromise(
        paymentGateway.charge({
          customerId,
          amount,
        }),
      )
        .mapError(
          (error) =>
            new ActivityError(
              "PAYMENT_FAILED",
              error instanceof Error ? error.message : "Payment failed",
              error,
            ),
        )
        .mapOk((transaction) => ({
          transactionId: transaction.id,
          status: "success" as const,
        }));
    },

    sendConfirmationEmail: ({ customerId, orderId }) => {
      return Future.fromPromise(
        emailService.send({
          to: customerId,
          template: "order-confirmation",
          data: { orderId },
        }),
      )
        .mapError(
          (error) =>
            new ActivityError(
              "EMAIL_FAILED",
              error instanceof Error ? error.message : "Failed to send email",
              error,
            ),
        )
        .mapOk(() => ({ sent: true }));
    },
  },
});
```

**Key Points:**

- Activities return `Future<Output, ActivityError>` objects
- Use `Future.fromPromise()` to wrap async operations
- Use `mapError()` to convert errors to `ActivityError` with error codes
- Use `mapOk()` to transform success values if needed

### Step 3: Write Type-Safe Workflows

Workflows use `declareWorkflow` and receive unwrapped plain values from activities:

```typescript
import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { orderContract } from "./contract";

export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderContract,
  implementation: async ({ activities }, input) => {
    // ✅ input is fully typed from contract!
    console.log(`Processing order ${input.orderId} for customer ${input.customerId}`);

    // ✅ Activities return plain values (Futures are unwrapped automatically)
    const inventory = await activities.validateInventory({
      items: input.items,
    });

    if (!inventory.available) {
      throw new Error(`Items unavailable: ${inventory.unavailableItems.join(", ")}`);
    }

    // Calculate total
    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Process payment - activity returns plain value
    const payment = await activities.processPayment({
      customerId: input.customerId,
      amount: totalAmount,
    });

    if (payment.status !== "success") {
      throw new Error("Payment was not successful");
    }

    // Send confirmation
    await activities.sendConfirmationEmail({
      customerId: input.customerId,
      orderId: input.orderId,
    });

    // ✅ Return type validated against contract schema
    return {
      success: true,
      orderId: input.orderId,
      totalAmount,
    };
  },
});
```

**Important:** Within workflows, activities return plain values. The `Future` unwrapping happens automatically by the framework. If an activity's Future contains an error, it throws an exception in the workflow.

### Step 4: Start the Worker

Create a worker using the standard Temporal Worker with your activities:

```typescript
import { Worker } from "@temporalio/worker";
import { activities } from "./activities";
import { orderContract } from "./contract";

async function startWorker() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: orderContract.taskQueue,
  });

  console.log("Worker started, listening for tasks...");
  await worker.run();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down worker...");
    await worker.shutdown();
    process.exit(0);
  });
}

startWorker().catch(console.error);
```

### Step 5: Execute Workflows from Client

Use the `TypedClient` to execute workflows with full type safety:

```typescript
import { TypedClient } from "@temporal-contract/client";
import { Connection, Client } from "@temporalio/client";
import { orderContract } from "./contract";

async function createOrder() {
  const connection = await Connection.connect({ address: "localhost:7233" });
  const temporalClient = new Client({ connection });
  const client = TypedClient.create(orderContract, temporalClient);

  // ✅ Fully typed! TypeScript knows exactly what fields are required
  const result = await client.executeWorkflow("processOrder", {
    workflowId: "order-12345",
    args: {
      orderId: "ORD-12345",
      customerId: "CUST-789",
      items: [
        { productId: "PROD-A", quantity: 2, price: 29.99 },
        { productId: "PROD-B", quantity: 1, price: 49.99 },
      ],
    },
  });

  console.log("Order processed successfully!");
  console.log(`Order ID: ${result.orderId}`);
  console.log(`Total: $${result.totalAmount}`);

  // ❌ TypeScript error: Type 'string' is not assignable to type 'number'
  // await client.executeWorkflow('processOrder', {
  //   workflowId: 'order-12345',
  //   args: {
  //     orderId: 'ORD-12345',
  //     customerId: 'CUST-789',
  //     items: [
  //       { productId: 'PROD-A', quantity: 'two', price: 29.99 }, // Error!
  //     ],
  //   },
  // });

  await connection.close();
}
```

## Result/Future Pattern for Error Handling

temporal-contract uses the **Result/Future pattern** from [@swan-io/boxed](https://github.com/swan-io/boxed) for explicit, type-safe error handling:

### In Activities

Activities return `Future` objects that can succeed or fail:

```typescript
const activities = declareActivitiesHandler({
  contract,
  activities: {
    processPayment: ({ orderId }) => {
      return Future.fromPromise(paymentService.process(orderId))
        .mapError((error) => new ActivityError("PAYMENT_FAILED", "Payment failed", error))
        .mapOk((txId) => ({ transactionId: txId }));
    },
  },
});
```

### In Child Workflows

Child workflows also return `Result` objects for explicit error handling:

```typescript
export const parentWorkflow = declareWorkflow({
  workflowName: "parentWorkflow",
  contract: myContract,
  implementation: async ({ executeChildWorkflow }, input) => {
    // Execute child workflow and get Result
    const childResult = await executeChildWorkflow(myContract, "processPayment", {
      workflowId: `payment-${input.orderId}`,
      args: { amount: input.totalAmount },
    });

    // Check for errors explicitly
    childResult.match({
      Ok: (output) => console.log("Payment processed:", output),
      Error: (error) => console.error("Payment failed:", error),
    });

    return { success: true };
  },
});
```

Benefits:

- ✅ **Explicit error handling** — No hidden exceptions
- ✅ **Type-safe** — Errors are part of the type system
- ✅ **Composable** — Chain operations with `map`, `flatMap`, etc.
- ✅ **Better debugging** — Clear error paths through your code

## Child Workflows with Type Safety

temporal-contract supports type-safe child workflow execution with the Result/Future pattern:

```typescript
// Define parent and child contracts
const childContract = defineContract({
  taskQueue: "notifications",
  workflows: {
    sendNotifications: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ sent: z.boolean() }),
    },
  },
});

const parentContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
    },
  },
});

// Execute child workflow with full type safety
export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: parentContract,
  implementation: async ({ executeChildWorkflow, startChildWorkflow }, input) => {
    // ... process order logic

    // Execute and wait for result
    const notificationResult = await executeChildWorkflow(childContract, "sendNotifications", {
      workflowId: `notification-${input.orderId}`,
      args: { orderId: input.orderId },
    });

    notificationResult.match({
      Ok: (output) => console.log("Notifications sent:", output.sent),
      Error: (error) => console.error("Failed:", error),
    });

    // Or start without waiting
    const handleResult = await startChildWorkflow(childContract, "sendNotifications", {
      workflowId: `notification-async-${input.orderId}`,
      args: { orderId: input.orderId },
    });

    handleResult.match({
      Ok: async (handle) => {
        // Can wait for result later
        const result = await handle.result();
        // ...
      },
      Error: (error) => console.error("Failed to start:", error),
    });

    return { success: true };
  },
});
```

## NestJS Integration

For teams using [NestJS](https://nestjs.com/), temporal-contract provides first-class integration. See the [@temporal-contract/worker-nestjs](https://www.npmjs.com/package/@temporal-contract/worker-nestjs) package for full documentation on using dependency injection with activities.

## Real-World Benefits

After using temporal-contract in production, here are the benefits we've seen:

### 1. **Catch Errors at Compile Time**

```typescript
// ❌ TypeScript error caught immediately
await client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: {
    orderId: 123, // Error: Type 'number' is not assignable to 'string'
    customerId: "CUST-456",
  },
});
```

### 2. **Refactor with Confidence**

Change your contract schema once, and TypeScript guides you to update all workflows, activities, and client code. No more runtime surprises!

### 3. **Better Onboarding**

New developers can see exactly what workflows are available, what they expect, and what they return — all through autocomplete and type hints.

### 4. **Reduced Bugs**

Validation at network boundaries catches invalid data before it reaches your business logic.

### 5. **Explicit Error Handling**

The Result/Future pattern provides clear, type-safe error handling for activities and child workflows without relying on exceptions.

## Monorepo Architecture

temporal-contract is built as a modular monorepo with separate packages:

| Package                            | Description                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `@temporal-contract/contract`      | Contract builder and type definitions                                        |
| `@temporal-contract/worker`        | Type-safe worker with automatic validation (uses @swan-io/boxed)             |
| `@temporal-contract/client`        | Type-safe client for executing workflows (uses @swan-io/boxed)               |
| `@temporal-contract/worker-nestjs` | NestJS integration with dependency injection                                 |
| `@temporal-contract/boxed`         | Temporal-compatible Result/Future types for workflows (alternative to @swan) |
| `@temporal-contract/testing`       | Testing utilities for integration tests                                      |

Install only what you need:

```bash
# Just contract and client
pnpm add @temporal-contract/contract @temporal-contract/client

# Add worker for workflow implementation
pnpm add @temporal-contract/worker

# Add NestJS integration
pnpm add @temporal-contract/worker-nestjs
```

## Getting Started

Ready to try temporal-contract? Here's how to get started:

### Installation

```bash
# Using pnpm (recommended)
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
pnpm add @temporalio/client @temporalio/worker zod @swan-io/boxed

# Using npm
npm install @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
npm install @temporalio/client @temporalio/worker zod @swan-io/boxed

# Using yarn
yarn add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
yarn add @temporalio/client @temporalio/worker zod @swan-io/boxed
```

### Quick Start

1. **Define your contract** in `contract.ts`
2. **Implement activities** with `declareActivitiesHandler` returning Futures
3. **Write workflows** with `declareWorkflow`
4. **Create a worker** with standard Temporal Worker
5. **Use the client** with `TypedClient.create()`
6. **Enjoy type safety!**

Check out the [Getting Started Guide](https://btravers.github.io/temporal-contract/guide/getting-started) for detailed instructions.

## Examples

The repository includes several complete examples showing real-world usage patterns. Visit the [examples directory](https://github.com/btravers/temporal-contract/tree/main/samples) to see:

- Basic workflow with activities
- Child workflow execution
- Error handling with Result/Future pattern
- NestJS integration

Each example is a working application you can run locally with a Temporal dev server.

## Comparison with Other Solutions

### vs. Plain Temporal SDK

- ✅ Type safety enforced at compile time
- ✅ Automatic validation
- ✅ Better DX with autocomplete
- ✅ Single source of truth for schemas
- ✅ Explicit error handling with Result/Future pattern

### vs. Manual Type Definitions

- ✅ No drift between types and implementations
- ✅ Automatic validation
- ✅ Less boilerplate
- ✅ Guaranteed consistency

### vs. Other Workflow Libraries

- ✅ Built specifically for Temporal.io
- ✅ Contract-first approach
- ✅ Result/Future pattern for error handling
- ✅ NestJS integration included

## What's Next?

We have exciting plans for temporal-contract:

- 🎯 **Nexus support** (v0.5.0) — Cross-namespace operations
- 🎯 **Enhanced testing utilities** — Better test helpers
- 🎯 **Signal/Query support** — Type-safe signals and queries
- 🎯 **More examples** — Real-world use cases
- 🎯 **Documentation improvements** — More guides and tutorials

## Contributing

temporal-contract is open source and we welcome contributions! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

Check out the [Contributing Guide](https://github.com/btravers/temporal-contract/blob/main/CONTRIBUTING.md) to get started.

## Resources

- **Documentation**: [https://btravers.github.io/temporal-contract](https://btravers.github.io/temporal-contract)
- **GitHub**: [https://github.com/btravers/temporal-contract](https://github.com/btravers/temporal-contract)
- **npm**: [@temporal-contract/contract](https://www.npmjs.com/package/@temporal-contract/contract)
- **Temporal.io**: [https://temporal.io](https://temporal.io)

## Conclusion

If you're building TypeScript applications with Temporal.io, **temporal-contract** can dramatically improve your development experience. By bringing type safety to workflows and activities, it catches errors at compile time, makes refactoring safer, and provides excellent developer experience with autocomplete and inline documentation.

The contract-first approach ensures consistency across your distributed workflows, while the Result/Future pattern provides robust error handling with explicit, type-safe errors.

Give it a try and let us know what you think! We'd love to hear your feedback and use cases.

---

**Try temporal-contract today:**

```bash
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
```

Happy orchestrating! ⚡🔄
