# Project Standards

This document defines the mandatory standards that must be followed throughout the project to maintain consistency, scalability, and facilitate maintenance.

## ⚠️ Locked Response System

**CRITICAL**: The response system is locked and CANNOT be modified. All endpoints MUST use the standard format.

### Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response Format

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

### Mandatory Usage

**All controllers MUST:**

1. Import strict types:
```typescript
import type { ControllerResponse } from '../core/types';
import { createSuccessResponse, createErrorResponse } from '../core/responses';
```

2. Use `ControllerResponse<T>` as return type:
```typescript
async function getPlayer(address: string): Promise<ControllerResponse<Player>> {
  // ...
}
```

3. Use `createSuccessResponse()` for successful responses:
```typescript
return createSuccessResponse(player, 'Player retrieved successfully');
```

4. Use `createErrorResponse()` for errors or let the middleware catch them:
```typescript
try {
  // ...
} catch (error) {
  return createErrorResponse(error);
}
```

**TypeScript will prevent compilation of code that doesn't follow these standards.**

## Naming Conventions

### Files
- **kebab-case**: `fish.service.ts`, `player.controller.ts`, `api-response.ts`

### Functions
- **camelCase**: `feedFishBatch()`, `getPlayerByAddress()`, `createSuccessResponse()`

### Classes and Types
- **PascalCase**: `FishService`, `PlayerController`, `ApiResponse`, `ValidationError`

### Endpoints
- **RESTful + descriptive**: 
  - `GET /api/player/:address`
  - `POST /api/fish/feed`
  - `PUT /api/tank/:id`

## Folder Structure

```
/src
├── api/                  # Routes grouped by resource
├── controllers/          # Controllers per endpoint
├── services/             # Game logic
├── models/               # Domain entities
└── core/
    ├── types/            # Shared types (LOCKED)
    ├── errors/           # Custom error classes
    ├── responses/        # Response helpers (LOCKED)
    ├── middleware/       # Global middleware
    ├── utils/            # Pure helpers
    └── config/           # Configuration
```

## Error Handling

**All errors MUST use custom error classes:**

- `ValidationError` - For input validation (400)
- `NotFoundError` - For resources not found (404)
- `ConflictError` - For state conflicts (409)
- `OnChainError` - For on-chain operation errors (500)

**Example:**
```typescript
if (!address) {
  throw new ValidationError('Address is required');
}

if (!player) {
  throw new NotFoundError(`Player with address ${address} not found`);
}
```

The error middleware will automatically catch these errors and transform them to the standard format.

## Layer Responsibilities

### Controllers
- Extract parameters from request
- Call corresponding service
- Return standardized responses
- **DO NOT contain business logic**

### Services
- Input validation
- Game logic
- Supabase calls
- Dojo/Starknet action execution
- Throw custom errors

### Models
- Define entity structures
- Define DTOs (Data Transfer Objects)
- **DO NOT contain logic**

## Comments and Documentation

- All files must have a `@fileoverview` JSDoc
- Public functions must have JSDoc comments
- Use comments in English
- Document parameters and return values

## TypeScript

- Strict mode enabled (`strict: true`)
- All types must be explicit
- Do not use `any` (use `unknown` if necessary)
- Validate types at compile time

## Git

- Descriptive commits using Conventional Commits
- One commit per file
- Messages in English by default

## Environment Variables

- All variables must be in `.env.example`
- Sensitive variables NEVER in code
- Validate required variables when starting the application

---

**Remember**: These standards are designed to keep the code scalable and maintainable. Following them is mandatory for all developers.

