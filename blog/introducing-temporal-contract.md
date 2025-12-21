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
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { processPayment, sendEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
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
✅ **Result/Future pattern** — Explicit error handling with [@swan-io/boxed](https://github.com/swan-io/boxed)  
✅ **Child workflows** — Type-safe child workflow execution  
✅ **NestJS integration** — First-class support for dependency injection  
✅ **Better DX** — Full autocomplete, inline documentation, and refactoring support

## How It Works

### Step 1: Define Your Contract

First, define your Temporal contract with workflows and activities in one place:

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

// Define contract once with full type safety
export const orderContract = defineContract({
  taskQueue: 'orders',
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
          })
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
              })
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
            status: z.enum(['success', 'failed', 'pending']),
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

Activities are automatically typed based on your contract:

```typescript
import { createActivities } from '@temporal-contract/worker';
import { orderContract } from './contract';
import { Result } from '@swan-io/boxed';

// ✅ Activities are fully typed! TypeScript knows the input/output types
const activities = createActivities(orderContract, {
  validateInventory: async (input) => {
    // input.items is typed!
    const unavailable: string[] = [];
    
    for (const item of input.items) {
      const inStock = await checkInventory(item.productId, item.quantity);
      if (!inStock) {
        unavailable.push(item.productId);
      }
    }

    // Return type is validated against schema
    return Result.Ok({
      available: unavailable.length === 0,
      unavailableItems: unavailable,
    });
  },

  processPayment: async (input) => {
    try {
      const transaction = await paymentGateway.charge({
        customerId: input.customerId,
        amount: input.amount,
      });

      return Result.Ok({
        transactionId: transaction.id,
        status: 'success' as const,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.Error(new Error(`Payment failed: ${message}`));
    }
  },

  sendConfirmationEmail: async (input) => {
    const sent = await emailService.send({
      to: input.customerId,
      template: 'order-confirmation',
      data: { orderId: input.orderId },
    });

    return Result.Ok({ sent });
  },
});
```

### Step 3: Write Type-Safe Workflows

Workflows have access to fully typed activities:

```typescript
import { createWorkflows } from '@temporal-contract/worker';
import { orderContract } from './contract';

const workflows = createWorkflows(orderContract, {
  processOrder: async (input, { activities }) => {
    // ✅ input is fully typed from contract!
    console.log(`Processing order ${input.orderId} for customer ${input.customerId}`);

    // ✅ Activities are typed - autocomplete works!
    const inventoryResult = await activities.validateInventory({
      items: input.items,
    });

    if (inventoryResult.isError()) {
      throw new Error('Inventory validation failed');
    }

    if (!inventoryResult.value.available) {
      throw new Error(
        `Items unavailable: ${inventoryResult.value.unavailableItems.join(', ')}`
      );
    }

    // Calculate total
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Process payment with Result pattern
    const paymentResult = await activities.processPayment({
      customerId: input.customerId,
      amount: totalAmount,
    });

    if (paymentResult.isError()) {
      throw new Error('Payment processing failed');
    }

    if (paymentResult.value.status !== 'success') {
      throw new Error('Payment was not successful');
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

### Step 4: Start the Worker

Create a worker that registers your workflows and activities:

```typescript
import { TypedTemporalWorker } from '@temporal-contract/worker';
import { orderContract } from './contract';
import { activities } from './activities';
import { workflows } from './workflows';

async function startWorker() {
  const worker = await TypedTemporalWorker.create({
    contract: orderContract,
    connection: {
      address: 'localhost:7233',
    },
    workflows,
    activities,
  });

  console.log('Worker started, listening for tasks...');
  await worker.run();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await worker.shutdown();
    process.exit(0);
  });
}

startWorker().catch(console.error);
```

### Step 5: Execute Workflows from Client

Use the typed client to execute workflows with full type safety:

```typescript
import { TypedTemporalClient } from '@temporal-contract/client';
import { orderContract } from './contract';

async function createOrder() {
  const client = await TypedTemporalClient.create({
    contract: orderContract,
    connection: {
      address: 'localhost:7233',
    },
  });

  // ✅ Fully typed! TypeScript knows exactly what fields are required
  const result = await client.executeWorkflow('processOrder', {
    workflowId: 'order-12345',
    args: {
      orderId: 'ORD-12345',
      customerId: 'CUST-789',
      items: [
        { productId: 'PROD-A', quantity: 2, price: 29.99 },
        { productId: 'PROD-B', quantity: 1, price: 49.99 },
      ],
    },
  });

  if (result.isOk()) {
    console.log('Order processed successfully!');
    console.log(`Order ID: ${result.value.orderId}`);
    console.log(`Total: $${result.value.totalAmount}`);
  } else {
    console.error('Order failed:', result.error);
  }

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

  await client.close();
}
```

## Result/Future Pattern for Error Handling

One of the standout features of temporal-contract is its use of the **Result/Future pattern** from [@swan-io/boxed](https://github.com/swan-io/boxed). This provides explicit, type-safe error handling without relying on exceptions:

```typescript
// Activities return Result<Success, Error>
const paymentResult = await activities.processPayment({
  customerId: 'CUST-123',
  amount: 99.99,
});

// Check for errors explicitly
if (paymentResult.isError()) {
  console.error('Payment failed:', paymentResult.error);
  // Handle error case
} else {
  console.log('Payment succeeded:', paymentResult.value);
  // Handle success case
}

// Or use pattern matching
paymentResult.match({
  Ok: (value) => console.log('Success:', value),
  Error: (error) => console.error('Failed:', error),
});
```

Benefits:

- ✅ **Explicit error handling** — No hidden exceptions
- ✅ **Type-safe** — Errors are part of the type system
- ✅ **Composable** — Chain operations with `map`, `flatMap`, etc.
- ✅ **Better debugging** — Clear error paths through your code

## NestJS Integration

For teams using [NestJS](https://nestjs.com/), temporal-contract provides first-class integration with dependency injection:

```typescript
import { Module } from '@nestjs/common';
import { TypedTemporalWorkerModule } from '@temporal-contract/worker-nestjs';
import { orderContract } from './contract';

@Module({
  imports: [
    TypedTemporalWorkerModule.register({
      contract: orderContract,
      connection: {
        address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
      },
    }),
  ],
})
export class OrderModule {}
```

Activities can use NestJS dependency injection:

```typescript
import { Injectable } from '@nestjs/common';
import { TypedActivity } from '@temporal-contract/worker-nestjs';
import { orderContract } from './contract';

@Injectable()
export class OrderActivities {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService,
  ) {}

  @TypedActivity(orderContract, 'processPayment')
  async processPayment(input: { customerId: string; amount: number }) {
    return this.paymentService.charge(input);
  }

  @TypedActivity(orderContract, 'sendConfirmationEmail')
  async sendEmail(input: { customerId: string; orderId: string }) {
    return this.emailService.sendOrderConfirmation(input);
  }
}
```

## Child Workflows with Type Safety

temporal-contract supports type-safe child workflow execution:

```typescript
// Define parent and child contracts
const childContract = defineContract({
  taskQueue: 'notifications',
  workflows: {
    sendNotifications: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ sent: z.boolean() }),
    },
  },
});

const parentContract = defineContract({
  taskQueue: 'orders',
  workflows: {
    processOrder: {
      // ... input/output schemas
      childWorkflows: {
        notifications: childContract,
      },
    },
  },
});

// Execute child workflow with full type safety
const workflows = createWorkflows(parentContract, {
  processOrder: async (input, { childWorkflows }) => {
    // ... process order logic

    // ✅ Child workflow execution is fully typed!
    const notificationResult = await childWorkflows.notifications.sendNotifications({
      orderId: input.orderId,
    });

    if (notificationResult.isOk()) {
      console.log('Notifications sent:', notificationResult.value.sent);
    }
  },
});
```

## Real-World Benefits

After using temporal-contract in production, here are the benefits we've seen:

### 1. **Catch Errors at Compile Time**

```typescript
// ❌ TypeScript error caught immediately
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 123, // Error: Type 'number' is not assignable to 'string'
    customerId: 'CUST-456',
  },
});
```

### 2. **Refactor with Confidence**

Change your contract schema once, and TypeScript guides you to update all workflows, activities, and client code. No more runtime surprises!

### 3. **Better Onboarding**

New developers can see exactly what workflows are available, what they expect, and what they return — all through autocomplete and type hints.

### 4. **Reduced Bugs**

Validation at network boundaries catches invalid data before it reaches your business logic.

### 5. **Consistent Error Handling**

The Result/Future pattern provides a consistent approach to error handling across all activities and workflows.

## Monorepo Architecture

temporal-contract is built as a modular monorepo with separate packages:

| Package                                    | Description                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| `@temporal-contract/contract`              | Contract builder and type definitions                 |
| `@temporal-contract/worker`                | Type-safe worker with automatic validation            |
| `@temporal-contract/client`                | Type-safe client for executing workflows              |
| `@temporal-contract/worker-nestjs`         | NestJS integration with dependency injection          |
| `@temporal-contract/boxed`                 | Temporal-compatible Result/Future types for workflows |
| `@temporal-contract/testing`               | Testing utilities for integration tests               |

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
2. **Implement activities** with automatic validation
3. **Write workflows** with typed activity proxies
4. **Create a worker** to execute workflows
5. **Use the client** to trigger workflows
6. **Enjoy type safety!**

Check out the [Getting Started Guide](https://btravers.github.io/temporal-contract/guide/getting-started) for detailed instructions.

## Examples

The repository includes several complete examples:

- **Basic workflow** - Simple workflow with activities
- **NestJS integration** - Using temporal-contract with NestJS
- **Child workflows** - Type-safe child workflow execution
- **Error handling** - Using Result/Future pattern

Each example is a working application you can run locally with a Temporal dev server.

## Comparison with Other Solutions

### vs. Plain Temporal SDK

- ✅ Type safety enforced at compile time
- ✅ Automatic validation
- ✅ Better DX with autocomplete
- ✅ Single source of truth for schemas

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
- 🎯 **OpenAPI/AsyncAPI generation** — Automatic documentation
- 🎯 **Enhanced testing utilities** — Better test helpers
- 🎯 **Signal/Query support** — Type-safe signals and queries
- 🎯 **CLI tools** — Contract validation and code generation
- 🎯 **More examples** — Real-world use cases

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

The contract-first approach ensures consistency across your distributed workflows, while the Result/Future pattern provides robust error handling without exceptions.

Give it a try and let us know what you think! We'd love to hear your feedback and use cases.

---

**Try temporal-contract today:**

```bash
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
```

Happy orchestrating! ⚡🔄
