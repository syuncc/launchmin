import { create } from "zustand";

// Auth state held in memory only. OWASP-acceptable AT storage equivalent to
// "JavaScript closure / private variable". Persistence across reloads is
// handled by the refresh-token cookie (HttpOnly) + bootstrap refresh in App.
interface AuthState {
	accessToken: string | null;
	expiresAt: number | null; // unix ms
	isAuthenticated: boolean;

	setTokens: (token: string, expiresIn: number) => void;
	clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	accessToken: null,
	expiresAt: null,
	isAuthenticated: false,

	setTokens: (token, expiresIn) =>
		set({
			accessToken: token,
			expiresAt: Date.now() + expiresIn * 1000,
			isAuthenticated: true,
		}),

	clear: () =>
		set({ accessToken: null, expiresAt: null, isAuthenticated: false }),
}));
