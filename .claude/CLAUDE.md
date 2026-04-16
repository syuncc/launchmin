## Project Structure
- Package manager: **npm** — NEVER use yarn, pnpm, or other alternatives
- Frontend: `client/`
- Backend: `api/`

## Work Method
- All code comments, commit messages, and documentation must be in English
- Clarify requirements before making changes — if requirements are unclear, ask me questions first, NEVER proceed with vague assumptions
- Read related source files and understand the context before modifying existing code
- Small steps — focus on one concern at a time, keep each change within a single component or module boundary
- After every code change: first review the modified code for security, correctness, edge cases, and convention adherence until satisfied, then run `npx biome check --write .` and `npx tsc --noEmit` in the affected directory
- NEVER install new npm packages without asking me first

## Testing
- Framework: Vitest + mongodb-memory-server
- Frontend: unit tests for pure logic only (utils, hooks, stores) — NO component render/interaction tests
- Backend: API integration tests (request → response) — NO isolated unit tests per layer
- Run `npm test` in the changed directory (`client/` or `api/`)

## Security
- When work involves any of the following, MUST read `docs/security-checklist.md` before writing code: authentication, session, JWT, password, authorization, RBAC, input validation, NoSQL injection, XSS, CSRF, API security, encryption, security headers, CORS, rate limiting, logging, audit, dependencies, file upload, impersonation

## Pre-Commit Review
Before every git commit, MUST:
1. Run `npx biome check --write .` in the affected directory to auto-fix formatting and lint issues
2. Run `npx tsc --noEmit` in the affected directory — must pass
3. Stage all auto-fixed files before committing
4. Review all changed files for:
   - Security: injection risks, exposed secrets, missing input validation, unsafe data handling
   - Code quality: error handling, edge cases, TypeScript type safety
   - Conventions: adherence to all rules listed in the Rules section below

## Tech Stack
- React, MUI, Hono, Node.js (>= 24), MongoDB
- Use TypeScript, NOT JavaScript — exception: tooling config files that require `.js`/`.mjs`
- Full tech stack details → .claude/rules/tech-stack.md

## Rules
If sub-rule files conflict with this file, this file takes precedence.
- API conventions → .claude/rules/api-conventions.md
- Backend architecture → .claude/rules/backend-architecture.md
- Git conventions → .claude/rules/git-conventions.md
- Design system → .claude/rules/design-rules.md
- Internationalization → .claude/rules/i18n.md
