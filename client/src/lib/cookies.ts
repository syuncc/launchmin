// Reads a cookie value from document.cookie. Used to extract the CSRF token
// (which is the only auth cookie set with HttpOnly=false — the others are
// HttpOnly and never visible to JS, as intended).
export function getCookie(name: string): string | null {
	for (const part of document.cookie.split("; ")) {
		const eqIdx = part.indexOf("=");
		if (eqIdx === -1) continue;
		if (part.slice(0, eqIdx) === name) {
			return decodeURIComponent(part.slice(eqIdx + 1));
		}
	}
	return null;
}
