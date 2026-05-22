import { Hono } from "hono";
import { loginRateLimit } from "../lib/rate-limit.js";
import { csrfProtect } from "../middleware/csrf-protect.js";
import * as controller from "./auth.controller.js";

const auth = new Hono();

// Login: no CSRF protection (no pre-existing session; attacker logging victim in
// as themselves is a separate attack class and typically out of scope).
// Rate-limited per-IP; account-level lockout enforced inside auth.service.
auth.post("/login", loginRateLimit, controller.login);

// Refresh + logout: cookie-authenticated → CSRF protection required.
auth.post("/refresh", csrfProtect, controller.refresh);
auth.post("/logout", csrfProtect, controller.logout);

export default auth;
