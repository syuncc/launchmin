# @launchmin/shared

Cross-cutting contracts shared between `api/` and `client/`. **Contains no server-only or browser-only code** — pure TypeScript and Zod only.

## Folder structure

| Folder | Contents |
|---|---|
| `src/schemas/` | Zod schemas: HTTP request inputs, response data, DB document shapes, atomic field definitions |
| `src/errors/` | Error code constants (UPPER_SNAKE_CASE) |
| `src/responses/` | Zod schemas for `SuccessResponse` / `ErrorResponse` wrappers |

## Naming conventions

| Suffix | Meaning | Example |
|---|---|---|
| `xxxField` | Reusable atomic field (composed into multiple schemas) | `emailField` |
| `xxxInput` | HTTP request body | `userRegisterInput` |
| `xxxQuery` | URL query params | `userListQuery` |
| `xxxResponse` | HTTP response data shape | `userRegisterResponse` |
| `xxxDocument` | DB stored shape (includes `_id`, hashed fields, etc.) | `userDocument` |
| `xxxOutput` | Domain object returned from service | `userOutput` |

## What goes here

- HTTP request/response schemas
- Atomic field schemas (`emailField`, `passwordField`, ...)
- Error code constants
- Pure TS types derived from schemas via `z.infer<typeof ...>`

## What does NOT go here

- Anything importing `mongodb`, `hono`, `react`, DOM types, or any runtime
- Service / repository / business logic
- Secrets, env vars, infrastructure config

## Build

Composite TypeScript project. MUST build before `api` or `client` can type-check:

```bash
# Build once
npm run build -w @launchmin/shared

# Or watch (run in a separate terminal during dev)
npm run dev -w @launchmin/shared
```
