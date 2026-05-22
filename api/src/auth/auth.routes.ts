import { Hono } from "hono";
import { csrfProtect } from "../middleware/csrf-protect.js";
import * as controller from "./auth.controller.js";

const auth = new Hono();

// Login: no CSRF protection (no pre-existing session; attacker logging victim in
// as themselves is a separate attack class and typically out of scope).
auth.post("/login", controller.login);

// Refresh + logout: cookie-authenticated → CSRF protection required.
auth.post("/refresh", csrfProtect, controller.refresh);
auth.post("/logout", csrfProtect, controller.logout);

export default auth;
