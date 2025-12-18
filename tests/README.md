# Tests Directory

This directory contains all unit tests for the project.

## Structure

Tests mirror the `src/` directory structure:

```
tests/
├── core/
│   ├── utils/          # Utility function tests
│   ├── errors/         # Error class tests (if needed)
│   └── middleware/     # Middleware tests (if needed)
├── services/           # Service layer tests
├── controllers/        # Controller tests
└── models/             # Model tests (if needed)
```

## Naming Convention

- Test files must end with `.test.ts`
- Test file names should match source file names
- Example: `src/services/player.service.ts` → `tests/services/player.service.test.ts`

## Running Tests

See `docs/testing.md` for complete testing guide.
