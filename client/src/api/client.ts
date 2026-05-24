import axios, {
	type AxiosError,
	type InternalAxiosRequestConfig,
	isAxiosError,
} from "axios";
import { getCookie } from "../lib/cookies";
import { useAuthStore } from "../stores/auth";

export const apiClient = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

// Exact-match list of endpoints that must NOT trigger refresh-on-401
// (would cause infinite loops or have their own auth semantics).
// Use an exact-match Set instead of substring matching so a future
// "/oauth-providers" or "/path/with/auth-suffix" does not accidentally
// get skipped.
const NO_REFRESH_RETRY = new Set([
	"/auth/login",
	"/auth/refresh",
	"/auth/logout",
]);

// Attach Bearer token from the in-memory store.
apiClient.interceptors.request.use((config) => {
	const token = useAuthStore.getState().accessToken;
	if (token) {
		config.headers.set("Authorization", `Bearer ${token}`);
	}
	return config;
});

// Refresh-on-401 with single-flight: concurrent requests during a refresh share the same promise.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
	const csrfToken = getCookie("__Host-csrf");
	if (!csrfToken) throw new Error("No CSRF token");

	const res = await axios.post<{
		data: { accessToken: string; expiresIn: number };
	}>(
		"/api/auth/refresh",
		{},
		{
			withCredentials: true,
			headers: { "X-CSRF-Token": csrfToken },
		},
	);
	const { accessToken, expiresIn } = res.data.data;
	useAuthStore.getState().setTokens(accessToken, expiresIn);
	return accessToken;
}

apiClient.interceptors.response.use(
	(res) => res,
	async (error: AxiosError) => {
		const original = error.config as
			| (InternalAxiosRequestConfig & { _retry?: boolean })
			| undefined;
		const url = original?.url ?? "";

		if (
			error.response?.status !== 401 ||
			!original ||
			original._retry ||
			NO_REFRESH_RETRY.has(url)
		) {
			return Promise.reject(error);
		}

		original._retry = true;

		// Step 1: refresh. On failure (RT expired/revoked), the session is over.
		let newToken: string;
		try {
			if (!refreshPromise) {
				refreshPromise = performRefresh().finally(() => {
					refreshPromise = null;
				});
			}
			newToken = await refreshPromise;
		} catch (refreshErr) {
			useAuthStore.getState().clear();
			return Promise.reject(refreshErr);
		}

		// Step 2: retry the original request with the new token. If THIS also
		// returns 401 (denylist / fingerprint mismatch / etc.), the session is
		// effectively dead too — clear the store so ProtectedRoute kicks in.
		original.headers.set("Authorization", `Bearer ${newToken}`);
		try {
			return await apiClient(original);
		} catch (retryErr) {
			if (isAxiosError(retryErr) && retryErr.response?.status === 401) {
				useAuthStore.getState().clear();
			}
			throw retryErr;
		}
	},
);
