# Git Conventions

> Strictly follows [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)

---

## Commit Message

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Type

The spec only mandates `feat` and `fix`. This project adopts the full `@commitlint/config-conventional` type list (derived from the [Angular convention](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md)):

- `feat` — a new feature (correlates with SemVer `MINOR`)
- `fix` — a bug fix (correlates with SemVer `PATCH`)
- `docs` — documentation only changes
- `style` — changes that do not affect the meaning of the code (whitespace, formatting, missing semicolons)
- `refactor` — a code change that neither fixes a bug nor adds a feature
- `perf` — a code change that improves performance
- `test` — adding missing tests or correcting existing tests
- `build` — changes that affect the build system or external dependencies (Vite, npm)
- `ci` — changes to CI configuration files and scripts (GitHub Actions)
- `chore` — other changes that don't modify src or test files
- `revert` — reverts a previous commit

No other types are allowed. Type must be lowercase.

### Scope

Optional. A noun describing a section of the codebase, surrounded by parentheses. One scope per commit:

`auth` · `users` · `roles` · `dashboard` · `layout` · `table` · `form` · `i18n` · `theme` · `api` · `db` · `middleware` · `config` · `deps`

Update this list when adding new modules.

### Description

- Immediately follows the colon and space after type/scope prefix
- Imperative, present tense: "add" not "added" nor "adds"
- Lowercase first letter, no period at the end
- Header line (type + scope + description) must not exceed 100 characters

### Body

- Separated from header by a blank line
- Explains what and why, not how
- Wrap at 100 characters per line

### Footer

- Separated from body by a blank line
- Each footer consists of a word token + `:<space>` or `<space>#` separator + value
- Token uses `-` in place of spaces (e.g. `Reviewed-by`), exception: `BREAKING CHANGE`
- Issue references: `Closes #123`, `Refs #456`

### Breaking Changes

Two ways to indicate (can be combined):

1. Append `!` after type/scope: `feat(api)!: change response format`
2. `BREAKING CHANGE:` footer (must be uppercase): `BREAKING CHANGE: response schema changed`
   `BREAKING-CHANGE:` is synonymous with `BREAKING CHANGE:` per spec.

Breaking changes correlate with SemVer `MAJOR` regardless of type.

### Examples

```
feat(auth): add Google OAuth2 login

Implement OAuth2 flow using arctic library with PKCE.
Tokens stored in httpOnly cookies with 7-day expiry.

Closes #12
```

```
fix(table): prevent crash when data array is empty
```

```
feat(api)!: flatten auth response schema

BREAKING CHANGE: /api/auth/login no longer nests user in data.user,
user fields are now at response root level.
```

```
chore(deps): bump react to 19.1.0
```

```
revert: remove Google OAuth2 login

Reverts commit 676104e.
```

```
docs: correct spelling in README
```

---

## Branch Strategy

`main` is the only long-lived branch. Always deployable.

Feature and fix branches are cut from `main`, merged back via squash merge, then deleted. Squash merge uses the PR title as the final commit message — PR titles must follow Conventional Commits format. Introduce a `dev` integration branch only when external contributors join.

### Branch Naming

```
<type>/<issue-number>-<short-description>
```

Lowercase, hyphen-separated, description no more than 5 words.

```
feat/12-oauth-login
fix/34-empty-table-crash
fix/56-jwt-token-expiry
docs/78-update-api-docs
refactor/90-extract-form-hook
```

---

## Versioning & Release

Follow [SemVer 2.0.0](https://semver.org/):

- `MAJOR` — commits containing `BREAKING CHANGE` or `!`
- `MINOR` — `feat` commits
- `PATCH` — `fix` and `perf` commits

Tag format: `v1.0.0`, `v1.0.0-beta.1`, `v1.0.0-rc.1`

### Release Flow

1. All tests pass on `main`
2. Generate CHANGELOG.md via `changelogen` or `conventional-changelog`
3. Tag: `git tag v1.x.x`
4. Push: `git push origin v1.x.x`
5. GitHub Actions creates Release from tag

---

## Claude Code Constraints

- Commit after each **logically complete change** (one endpoint, one component, one bugfix), not after every edit
- Run `git diff --staged` before committing — never include `.env`, `node_modules`, `dist`, or unrelated files
- `npm run lint` and `npm run typecheck` must pass before commit
- Never `--force` push to `main`
- Never commit directly on `main` — always use a feature branch
- Resolve merge conflicts file by file — never blindly `--theirs` or `--ours`
- All commit messages in English
