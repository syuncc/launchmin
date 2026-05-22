import { ERROR_CODES, type UserLoginInput } from "@launchmin/shared";
import { ObjectId } from "mongodb";
import { generateCsrfToken } from "../lib/csrf.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import { generateFingerprint } from "../lib/fingerprint.js";
import { signAccessToken, verifyAccessToken } from "../lib/jwt.js";
import { getDummyHash, verifyPassword } from "../lib/password.js";
import { generateJti, generateRefreshToken, hashToken } from "../lib/tokens.js";
import * as userRepo from "../users/users.repository.js";
import * as denylistRepo from "./denylist.repository.js";
import * as rtRepo from "./refresh-tokens.repository.js";

export interface AuthTokens {
	accessToken: string;
	expiresIn: number;
	refreshTokenRaw: string;
	fingerprintRaw: string;
	csrfToken: string;
}

export async function login(
	input: UserLoginInput,
	deviceInfo: string,
): Promise<AuthTokens> {
	// OWASP anti-enumeration: identical timing and error for non-existent vs wrong-password.
	const user = await userRepo.findByUsername(input.account.toLowerCase());
	const hashToVerify = user?.passwordHash ?? (await getDummyHash());
	const passwordOk = await verifyPassword(input.password, hashToVerify);

	if (!user || !passwordOk) {
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Login failed; invalid user ID or password",
		);
	}

	return issueTokens(user._id, new ObjectId(), deviceInfo);
}

export async function refresh(
	refreshTokenRaw: string,
	deviceInfo: string,
): Promise<AuthTokens> {
	const tokenHash = hashToken(refreshTokenRaw);
	const stored = await rtRepo.findByHash(tokenHash);

	if (!stored) {
		throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
	}

	// REUSE DETECTION: presenting an already-rotated token means either the
	// legitimate user is racing with an attacker who stole it. Revoke the
	// entire family so both parties must re-authenticate.
	if (stored.isRevoked) {
		await rtRepo.revokeFamily(stored.familyId);
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Refresh token reuse detected",
		);
	}

	if (stored.expiresAt < new Date()) {
		throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Refresh token expired");
	}

	const tokens = await issueTokens(stored.userId, stored.familyId, deviceInfo);
	await rtRepo.markUsedAndReplaced(
		tokenHash,
		hashToken(tokens.refreshTokenRaw),
	);
	return tokens;
}

export async function logout(
	refreshTokenRaw: string | undefined,
	accessToken: string | undefined,
): Promise<void> {
	// Revoke the entire RT family (covers parallel sessions in the same family).
	if (refreshTokenRaw) {
		const stored = await rtRepo.findByHash(hashToken(refreshTokenRaw));
		if (stored) {
			await rtRepo.revokeFamily(stored.familyId);
		}
	}

	// Denylist the access token so it can't be reused before its natural expiry.
	if (accessToken) {
		try {
			const claims = await verifyAccessToken(accessToken);
			await denylistRepo.add(
				hashToken(accessToken),
				new Date(claims.exp * 1000),
			);
		} catch {
			// Token already invalid (expired, tampered, etc.) — nothing to do.
		}
	}
}

async function issueTokens(
	userId: ObjectId,
	familyId: ObjectId,
	deviceInfo: string,
): Promise<AuthTokens> {
	const e = env();
	const fingerprint = generateFingerprint();
	const refresh = generateRefreshToken();
	const jti = generateJti();
	const now = new Date();

	await rtRepo.insert({
		tokenHash: refresh.hash,
		userId,
		familyId,
		issuedAt: now,
		expiresAt: new Date(now.getTime() + e.REFRESH_TOKEN_TTL * 1000),
		lastUsedAt: null,
		isRevoked: false,
		replacedByHash: null,
		deviceInfo,
	});

	const { token } = await signAccessToken({
		userId: userId.toHexString(),
		jti,
		fingerprintHash: fingerprint.hash,
	});

	return {
		accessToken: token,
		expiresIn: e.ACCESS_TOKEN_TTL,
		refreshTokenRaw: refresh.raw,
		fingerprintRaw: fingerprint.raw,
		csrfToken: generateCsrfToken(),
	};
}
