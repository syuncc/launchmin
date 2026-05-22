import { sign as honoSign, verify as honoVerify } from "hono/jwt";
import { z } from "zod";
import { env } from "./env.js";

const ALG = "HS256" as const;
const TYP = "access+jwt" as const;

const accessTokenClaimsSchema = z.object({
	iss: z.string(),
	aud: z.string(),
	sub: z.string(),
	jti: z.string(),
	typ: z.literal(TYP),
	fp: z.string(),
	iat: z.number(),
	nbf: z.number(),
	exp: z.number(),
});

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

export async function signAccessToken(args: {
	userId: string;
	jti: string;
	fingerprintHash: string;
}): Promise<{ token: string; exp: number; jti: string }> {
	const e = env();
	const now = Math.floor(Date.now() / 1000);
	const exp = now + e.ACCESS_TOKEN_TTL;

	const payload: AccessTokenClaims = {
		iss: e.JWT_ISSUER,
		aud: e.JWT_AUDIENCE,
		sub: args.userId,
		jti: args.jti,
		typ: TYP,
		fp: args.fingerprintHash,
		iat: now,
		nbf: now,
		exp,
	};

	const token = await honoSign(payload, e.JWT_SECRET, ALG);
	return { token, exp, jti: args.jti };
}

export async function verifyAccessToken(
	token: string,
): Promise<AccessTokenClaims> {
	const e = env();
	// hono/jwt validates signature, alg (rejects mismatched algs), exp, nbf.
	const decoded = await honoVerify(token, e.JWT_SECRET, ALG);

	// Shape + constant value checks (iss, aud, typ).
	const claims = accessTokenClaimsSchema.parse(decoded);
	if (claims.iss !== e.JWT_ISSUER) throw new Error("Invalid issuer");
	if (claims.aud !== e.JWT_AUDIENCE) throw new Error("Invalid audience");
	return claims;
}
