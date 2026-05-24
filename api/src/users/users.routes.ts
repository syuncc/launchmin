import { Hono } from "hono";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import * as controller from "./users.controller.js";

const users = new Hono();

// Admin-only: this is a back-office system, accounts are created by admins,
// not via public sign-up.
users.post("/", requireAuth, requireAdmin, controller.register);
users.get("/me", requireAuth, controller.me);

export default users;
