import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 16;
const TAG_LENGTH = 64;
const MEMORY = 19456; // 19 MiB in KiB
const PASSES = 2;
const PARALLELISM = 1;

// Cached dummy hash used in the non-existent-user login branch to keep the
// response time constant regardless of whether the account exists (anti-enumeration).
let cachedDummyHash: string | undefined;

export async function getDummyHash(): Promise<string> {
	if (!cachedDummyHash) {
		cachedDummyHash = await hashPassword("X".repeat(32));
	}
	return cachedDummyHash;
}

export function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH);
	return new Promise((resolve, reject) => {
		argon2(
			"argon2id",
			{
				message: password,
				nonce: salt,
				memory: MEMORY,
				passes: PASSES,
				parallelism: PARALLELISM,
				tagLength: TAG_LENGTH,
			},
			(err, key) => {
				if (err) return reject(err);
				resolve(`${salt.toString("base64")}.${key.toString("base64")}`);
			},
		);
	});
}

export function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	const [saltBase64, keyBase64] = hash.split(".");
	if (!saltBase64 || !keyBase64) return Promise.resolve(false);

	const salt = Buffer.from(saltBase64, "base64");
	const storedKey = Buffer.from(keyBase64, "base64");

	return new Promise((resolve, reject) => {
		argon2(
			"argon2id",
			{
				message: password,
				nonce: salt,
				memory: MEMORY,
				passes: PASSES,
				parallelism: PARALLELISM,
				tagLength: TAG_LENGTH,
			},
			(err, key) => {
				if (err) return reject(err);
				resolve(timingSafeEqual(storedKey, key));
			},
		);
	});
}
