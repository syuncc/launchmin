# Backend Architecture

## Project Structure
- Hono app definition (app.ts) and server startup (server.ts) MUST be separated, NEVER in the same file
- Organize code by business component (users/, roles/, auth/), NEVER by technical role (all controllers in one directory)
- Each component layered internally: routes → controllers → services → repositories (data access) / models (TypeScript types/interfaces)
- NEVER leak web layer objects (Context) into services — services accept and return plain data only

## Route & Controller Pattern
- Route file: `resourceName.routes.ts`
- Controller file: `resourceName.controller.ts`
- Controller responsibility: parse request → call service → send response
- Business logic belongs in `services/`, NEVER in controllers or routes
- All input MUST be validated with a schema before reaching controller logic

## Error Handling
- Custom error class extends built-in Error with statusCode and error code
- Distinguish operational errors (invalid input, resource not found) from programmer errors (undefined variable, type error)
- Operational errors: return appropriate HTTP status code, NEVER crash the process
- Programmer errors: log then gracefully shut down the process
- Use Hono's `onError` hook as the global error handler
- Error handler only catches and forwards — actual handling logic lives in a centralized error handler module
- Listen for `unhandledRejection` and `uncaughtException`, log then gracefully shut down
- NEVER expose stack traces, internal paths, or database details in responses
- Log full error details server-side, return sanitized message to client

## Process Management
- Listen for SIGTERM and SIGINT signals, implement graceful shutdown: stop accepting new requests → finish in-flight requests → close database connections → exit process
- In Dockerfile use `CMD ["node", "dist/server.js"]` to start, NEVER use `npm start` (npm does not forward OS signals)
- All imports at the top of the file, NEVER dynamic imports inside functions (blocks event loop and delays error discovery)

## Security
- NEVER hardcode secrets, connection strings, or any sensitive information
- All secrets injected via environment variables, validated at startup
- NEVER commit .env files, use .env.example as template
- Set HTTP security headers
- Implement rate limiting to prevent brute force and DDoS
- All user input MUST be validated and sanitized before use to prevent injection attacks
- NEVER log passwords, tokens, or other sensitive data
