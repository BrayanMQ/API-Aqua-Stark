# Error Handling

This document describes the error handling system in the Aqua Stark Backend API.

## Overview

All errors in the application are handled through a centralized system that ensures consistent error responses across all endpoints. The system uses custom error classes and a global error middleware.

## Custom Error Classes

The application defines custom error classes that extend `BaseError`. Each error class has a specific HTTP status code and error type.

### Available Error Classes

#### ValidationError (400)
Thrown when input validation fails.

```typescript
import { ValidationError } from '../core/errors';

if (!address) {
  throw new ValidationError('Address is required');
}

if (address.length < 42) {
  throw new ValidationError('Invalid address format');
}
```

#### NotFoundError (404)
Thrown when a requested resource is not found.

```typescript
import { NotFoundError } from '../core/errors';

const player = await getPlayer(address);
if (!player) {
  throw new NotFoundError(`Player with address ${address} not found`);
}
```

#### ConflictError (409)
Thrown when a request conflicts with the current state.

```typescript
import { ConflictError } from '../core/errors';

const existingPlayer = await findPlayerByAddress(address);
if (existingPlayer) {
  throw new ConflictError('Player already exists');
}
```

#### OnChainError (500)
Thrown when an on-chain operation fails.

```typescript
import { OnChainError } from '../core/errors';

try {
  const txHash = await executeOnChainAction();
} catch (error) {
  throw new OnChainError('Failed to execute on-chain action', txHash);
}
```

## Error Response Format

All errors are automatically transformed to the standard error response format:

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Address is required",
    "code": 400
  }
}
```

## Error Middleware

The global error handler (`src/core/middleware/error-handler.ts`) automatically:

1. Catches all errors thrown in controllers or services
2. Identifies the error type (custom error, Fastify validation error, etc.)
3. Transforms the error to the standard format
4. Returns the appropriate HTTP status code

### How It Works

```typescript
// In your controller or service
try {
  const result = await someOperation();
  return createSuccessResponse(result);
} catch (error) {
  // If it's a custom error, it will be automatically handled
  // If it's a generic error, it will be transformed to InternalError
  throw error; // Let the middleware handle it
}
```

## Best Practices

### 1. Use Appropriate Error Classes

Always use the most specific error class for the situation:

- Use `ValidationError` for invalid inputs
- Use `NotFoundError` for missing resources
- Use `ConflictError` for state conflicts
- Use `OnChainError` for blockchain-related failures

### 2. Provide Clear Error Messages

Error messages should be clear and helpful:

```typescript
// Good
throw new ValidationError('Address must be 42 characters long');

// Bad
throw new ValidationError('Invalid');
```

### 3. Let Middleware Handle Errors

In most cases, you can let errors bubble up to the middleware:

```typescript
// Good - Let middleware handle it
async function getPlayer(address: string) {
  if (!address) {
    throw new ValidationError('Address is required');
  }
  // ...
}

// Also acceptable - Catch and transform manually
async function getPlayer(address: string) {
  try {
    // ...
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

### 4. Don't Catch Errors Unnecessarily

Only catch errors if you need to:
- Add additional context
- Transform the error type
- Perform cleanup operations

```typescript
// Unnecessary catch
try {
  const player = await getPlayer(address);
  return createSuccessResponse(player);
} catch (error) {
  return createErrorResponse(error); // Middleware does this automatically
}

// Better - Let it bubble up
const player = await getPlayer(address);
return createSuccessResponse(player);
```

## Error Types Reference

| Error Class      | HTTP Code | Use Case                          |
|-----------------|-----------|-----------------------------------|
| ValidationError | 400       | Invalid input, missing fields     |
| NotFoundError   | 404       | Resource not found                |
| ConflictError   | 409       | Duplicate resources, state issues |
| OnChainError    | 500       | Blockchain operation failures     |

## Creating Custom Errors

If you need a new error type, extend `BaseError`:

```typescript
import { BaseError } from '../core/errors/base-error';

export class CustomError extends BaseError {
  constructor(message: string) {
    super(message, 418, 'CustomError'); // HTTP code, error type
  }
}
```

Then add it to `src/core/errors/index.ts` for easy importing.

