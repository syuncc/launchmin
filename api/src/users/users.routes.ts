import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import * as controller from "./users.controller.js";

const users = new Hono();

users.post("/", controller.register);
users.get("/me", requireAuth, controller.me);

export default users;
