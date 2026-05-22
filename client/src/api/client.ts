import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getCookie } from "../lib/cookies";
import { useAuthStore } from "../stores/auth";

export const apiClient = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

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

		// Don't retry auth endpoints themselves (avoids infinite refresh loops).
		const url = original?.url ?? "";
		const isAuthEndpoint = url.includes("/auth/");

		if (
			error.response?.status === 401 &&
			original &&
			!original._retry &&
			!isAuthEndpoint
		) {
			original._retry = true;
			try {
				if (!refreshPromise) {
					refreshPromise = performRefresh().finally(() => {
						refreshPromise = null;
					});
				}
				const newToken = await refreshPromise;
				original.headers.set("Authorization", `Bearer ${newToken}`);
				return apiClient(original);
			} catch (err) {
				useAuthStore.getState().clear();
				return Promise.reject(err);
			}
		}
		return Promise.reject(error);
	},
);
