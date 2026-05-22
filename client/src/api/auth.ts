import type { UserLoginInput } from "@launchmin/shared";
import axios from "axios";
import { getCookie } from "../lib/cookies";
import { apiClient } from "./client";

export interface AuthSession {
	accessToken: string;
	expiresIn: number;
}

export async function login(input: UserLoginInput): Promise<AuthSession> {
	const res = await apiClient.post<{ data: AuthSession }>("/auth/login", input);
	return res.data.data;
}

// Uses raw axios (not apiClient) to bypass the request/response interceptors;
// refresh has its own dedicated logic in client.ts and shouldn't trigger itself.
export async function refresh(): Promise<AuthSession> {
	const csrfToken = getCookie("__Host-csrf");
	if (!csrfToken) throw new Error("Not authenticated");

	const res = await axios.post<{ data: AuthSession }>(
		"/api/auth/refresh",
		{},
		{
			withCredentials: true,
			headers: { "X-CSRF-Token": csrfToken },
		},
	);
	return res.data.data;
}

export async function logout(): Promise<void> {
	const csrfToken = getCookie("__Host-csrf");
	if (!csrfToken) return;
	await apiClient.post(
		"/auth/logout",
		{},
		{ headers: { "X-CSRF-Token": csrfToken } },
	);
}
