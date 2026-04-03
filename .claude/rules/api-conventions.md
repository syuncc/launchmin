# API Conventions

## URL Structure
- Use plural nouns for resources: `/users`, `/roles`, NEVER `/user`, `/getUsers`
- Lowercase + kebab-case: `/user-profiles`, NEVER `/userProfiles`
- Max 2 levels of nesting: `/users/:userId/sessions`, NEVER deeper
- Use query params for filtering/sorting/pagination: `/users?role=admin&sort=-createdAt&page=2&limit=20`

## HTTP Methods
- GET MUST NOT produce side effects or modify data
- Use PATCH for partial updates, PUT for full replacement

## HTTP Status Codes
- POST success uses 201, NEVER 200
- Strictly distinguish 401 (not authenticated) from 403 (not authorized)
- 500 MUST NOT expose internal details

## Response Format

### Field Definitions
- `success`: boolean, true or false
- `message`: string, required in ALL responses. NEVER expose internal system info. Use vague messages for sensitive operations (OWASP), e.g.: login failure always "Login failed; Invalid userID or password", registration/password recovery always "If an account with this email exists, you will receive an email shortly"
- `data`: business data, only present when success is true
- `error`: error object, only present when success is false, format: `{ code: string, details?: array }`
- `error.code` uses UPPER_SNAKE_CASE, e.g. `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `UNAUTHORIZED`, `DUPLICATE_RESOURCE`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`
- All error codes defined in a centralized constants file (e.g. `server/src/constants/error-codes.ts`), NEVER use inline strings
- `pagination`: pagination object, only present for list queries, sibling of data
- When success is true, NEVER include error field; when success is false, NEVER include data field

### Success Response Example
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {}
}
```

### Paginated Success Response Example
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response Example
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  }
}
```
