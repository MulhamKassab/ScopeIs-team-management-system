import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { errors } from "@/shared/errors/app-error";

const prefix = "scrypt$v1$32768$8$1";
const pattern = /^scrypt\$v1\$32768\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
const dummyHash = `${prefix}$${"00".repeat(16)}$${"00".repeat(64)}`;

export function passwordPepper(input: NodeJS.ProcessEnv = process.env) {
  const pepper = input.AUTH_PASSWORD_PEPPER;
  if (!pepper || Buffer.byteLength(pepper) < 32) throw errors.authUnavailable();
  return pepper;
}

function derive(password: string, salt: string, pepper: string): Promise<Buffer> {
  const input = createHmac("sha256", pepper).update(password, "utf8").digest();
  return new Promise((resolve, reject) => scrypt(input, Buffer.from(salt, "hex"), 64,
    { N: 32768, r: 8, p: 1, maxmem: 48 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string, pepper = passwordPepper()) {
  if (password.length < 1 || password.length > 128) throw errors.validation();
  const salt = randomBytes(16).toString("hex");
  return `${prefix}$${salt}$${(await derive(password, salt, pepper)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null, pepper = passwordPepper()) {
  if (password.length < 1 || password.length > 128) throw errors.validation();
  // Unknown accounts and invalid stored formats still pay the same bounded KDF cost.
  const match = pattern.exec(stored ?? "");
  const selected = match ?? pattern.exec(dummyHash)!;
  const actual = await derive(password, selected[1], pepper);
  return timingSafeEqual(actual, Buffer.from(selected[2], "hex")) && match !== null;
}
