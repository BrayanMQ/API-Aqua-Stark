# 🧱 Aqua Stark Backend API

Backend API for **Aqua Stark**, an on-chain game based on Starknet.

This backend orchestrates all actions between:
- Unity (frontend)
- Cartridge (authentication)
- Supabase (off-chain data)
- Dojo + Cairo contracts (on-chain)

## 🚀 Quick Start

### Prerequisites

- Node.js `20.10.0` (exact version required)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## 📚 Documentation

All documentation is available in the `/docs` directory:

- **[Getting Started](./docs/getting-started.md)** - Setup and development guide
- **[Architecture](./docs/architecture.md)** - System architecture and design
- **[Standards](./docs/standards.md)** - Coding standards and conventions
- **[Error Handling](./docs/error-handling.md)** - Error management system
- **[Models](./docs/models.md)** - Data model guidelines
- **[Responses](./docs/responses.md)** - Response system documentation

## ⚙️ Technology Stack

| Technology     | Version      | Purpose                    |
|----------------|--------------|----------------------------|
| Node.js        | 20.10.0      | JavaScript runtime         |
| TypeScript     | 5.3.x        | Type safety                |
| Fastify        | 4.24.x       | HTTP framework             |
| Supabase JS    | 2.38.3       | Database and storage       |
| Starknet.js    | 5.14.x       | Blockchain interactions    |
| Dojo Client    | 0.4.x        | On-chain ECS               |

## 📁 Project Structure

```
/src
├── api/                  # Routes grouped by resource
├── controllers/          # Request handlers
├── services/             # Business logic
├── models/               # Domain entities
└── core/
    ├── types/            # Shared types (LOCKED)
    ├── errors/           # Custom error classes
    ├── responses/        # Response helpers (LOCKED)
    ├── middleware/       # Global middleware
    ├── utils/            # Utility functions
    └── config/           # Configuration
```

## ⚠️ Important Standards

**The response system is locked.** All endpoints MUST use:
- `createSuccessResponse()` for successful responses
- `createErrorResponse()` for errors
- `ControllerResponse<T>` as return type

See [Standards](./docs/standards.md) and [Responses](./docs/responses.md) for details.

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anonymous key
- `STARKNET_RPC` - Starknet RPC endpoint
- `CARTRIDGE_AUTH_URL` - Cartridge authentication URL

## 🧪 Development

```bash
# Development mode with hot-reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run type-check` - Verify types without compiling

## 🤝 Contributing

1. Read [Getting Started](./docs/getting-started.md) for setup
2. Follow [Standards](./docs/standards.md) for coding conventions
3. Use strict TypeScript types
4. All endpoints must follow the standard response format

## 📄 License

MIT
