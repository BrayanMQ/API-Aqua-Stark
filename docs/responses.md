# Response System

This document describes the locked response system that ensures all API endpoints return consistent, standardized responses.

## Overview

The response system is **locked** and cannot be modified. All endpoints MUST use the standardized response format. TypeScript enforces this at compile time, making it impossible to return responses that don't follow the standard.

## Response Types

### Success Response

All successful operations return this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful"
}
```

**Type Definition:**
```typescript
type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string;
};
```

### Error Response

All errors return this format:

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Error message here",
    "code": 400
  }
}
```

**Type Definition:**
```typescript
type ErrorResponse = {
  success: false;
  error: {
    type: string;
    message: string;
    code: number;
  };
};
```

## Creating Responses

### Success Responses

Use `createSuccessResponse()` for all successful operations:

```typescript
import { createSuccessResponse } from '../core/responses';

// With data only
return createSuccessResponse(player);

// With data and custom message
return createSuccessResponse(player, 'Player retrieved successfully');
```

**Function Signature:**
```typescript
function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T>
```

### Error Responses

Use `createErrorResponse()` for errors, or let the error middleware handle them:

```typescript
import { createErrorResponse } from '../core/responses';

// Manual error response
try {
  // ...
} catch (error) {
  return createErrorResponse(error);
}

// Or let middleware handle it (recommended)
async function getPlayer(address: string) {
  if (!address) {
    throw new ValidationError('Address is required');
  }
  // Middleware will catch and transform the error
}
```

**Function Signature:**
```typescript
function createErrorResponse(error: unknown): ErrorResponse
```

## Controller Response Type

All controllers MUST use `ControllerResponse<T>` as their return type:

```typescript
import type { ControllerResponse } from '../core/types';
import { createSuccessResponse } from '../core/responses';

async function getPlayer(
  address: string
): Promise<ControllerResponse<Player>> {
  const player = await playerService.getByAddress(address);
  return createSuccessResponse(player, 'Player retrieved successfully');
}
```

**Type Definition:**
```typescript
type ControllerResponse<T> = ApiResponse<T>;
// Where ApiResponse<T> = SuccessResponse<T> | ErrorResponse
```

TypeScript will prevent compilation if you try to return anything else.

## Response Examples

### GET Endpoint

```typescript
export async function getPlayer(
  request: FastifyRequest<{ Params: { address: string } }>,
  reply: FastifyReply
): Promise<ControllerResponse<Player>> {
  try {
    const { address } = request.params;
    const player = await playerService.getByAddress(address);
    return createSuccessResponse(player, 'Player retrieved successfully');
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "address": "0x123...",
    "username": "Player1",
    "xp": 1000,
    "level": 5
  },
  "message": "Player retrieved successfully"
}
```

### POST Endpoint

```typescript
export async function createPlayer(
  request: FastifyRequest<{ Body: CreatePlayerDto }>,
  reply: FastifyReply
): Promise<ControllerResponse<Player>> {
  try {
    const dto = request.body;
    const player = await playerService.create(dto);
    return createSuccessResponse(player, 'Player created successfully');
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "address": "0x123...",
    "username": "Player1",
    "xp": 0,
    "level": 1
  },
  "message": "Player created successfully"
}
```

### Error Response Example

```typescript
export async function getPlayer(
  request: FastifyRequest<{ Params: { address: string } }>,
  reply: FastifyReply
): Promise<ControllerResponse<Player>> {
  const { address } = request.params;
  
  if (!address) {
    throw new ValidationError('Address is required');
  }
  
  const player = await playerService.getByAddress(address);
  // If player not found, service throws NotFoundError
  // Middleware transforms it to standard format
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "type": "NotFoundError",
    "message": "Player with address 0x123... not found",
    "code": 404
  }
}
```

## Type Guards

Use type guards to check response types:

```typescript
import { isSuccessResponse, isErrorResponse } from '../core/responses';

const response = await getPlayer(address);

if (isSuccessResponse(response)) {
  // TypeScript knows response is SuccessResponse<Player>
  console.log(response.data);
  console.log(response.message);
}

if (isErrorResponse(response)) {
  // TypeScript knows response is ErrorResponse
  console.log(response.error.type);
  console.log(response.error.message);
}
```

## Why This System is Locked

1. **Consistency**: All endpoints return the same format
2. **Client Compatibility**: Clients can rely on a consistent structure
3. **Maintainability**: Changes to response format would break all clients
4. **Type Safety**: TypeScript prevents incorrect usage at compile time
5. **Scalability**: Easy to add new endpoints without worrying about format

## Best Practices

### 1. Always Use Helper Functions

Never create responses manually:

```typescript
// ❌ Bad - Don't do this
return {
  success: true,
  data: player,
  message: 'Success'
};

// ✅ Good - Use helper function
return createSuccessResponse(player, 'Player retrieved successfully');
```

### 2. Let Middleware Handle Errors When Possible

```typescript
// ❌ Unnecessary catch
try {
  const player = await getPlayer(address);
  return createSuccessResponse(player);
} catch (error) {
  return createErrorResponse(error);
}

// ✅ Better - Let middleware handle it
const player = await getPlayer(address);
return createSuccessResponse(player);
```

### 3. Use Descriptive Messages

```typescript
// ❌ Generic message
return createSuccessResponse(player);

// ✅ Descriptive message
return createSuccessResponse(player, 'Player retrieved successfully');
```

### 4. Type Your Responses

Always use `ControllerResponse<T>`:

```typescript
// ✅ Correct
async function getPlayer(): Promise<ControllerResponse<Player>> {
  // ...
}

// ❌ Wrong - TypeScript will error
async function getPlayer(): Promise<Player> {
  // ...
}
```

## Response System Files

- `src/core/types/api-response.ts` - Type definitions (LOCKED)
- `src/core/types/controller-response.ts` - Controller response type (LOCKED)
- `src/core/responses/index.ts` - Helper functions (LOCKED)

**⚠️ WARNING**: These files define the response system. Do not modify them without careful consideration of the impact on the entire API.

