import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

/**
 * Cifrado AES-256-GCM para datos personales y hash de contraseñas.
 * Formato de valor cifrado: v<version>.<iv b64>.<tag b64>.<dato b64>
 * La clave maestra (32 bytes, base64) vive en DATA_ENCRYPTION_KEY.
 * El hash de contraseña se guarda cifrado: una fuga solo de la base de datos
 * no revela contraseñas; quien tenga además la clave puede verificar con Argon2.
 */

const MASTER_KEY = () => {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY no está definida");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY debe ser de 32 bytes en base64");
  return key;
};

export function encryptField(plaintext: string, keyVersion = 1): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", MASTER_KEY(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${keyVersion}.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptField(payload: string): string {
  const [vTag, ivB64, tagB64, dataB64] = payload.split(".");
  if (vTag?.[0] !== "v") throw new Error("Formato de cifrado inválido");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", MASTER_KEY(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Hash Argon2id con sal aleatoria; se devuelve cifrado con AES-256-GCM. */
export async function hashPassword(password: string): Promise<string> {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB, recomendación OWASP
    timeCost: 2,
    parallelism: 1,
  });
  return encryptField(hash);
}

/** Verifica una contraseña contra el hash cifrado almacenado. */
export async function verifyPassword(encryptedHash: string, password: string): Promise<boolean> {
  const hash = decryptField(encryptedHash);
  return argon2.verify(hash, password);
}

/** Hash SHA-256 para tokens opacos (sesiones, tokens de correo). Nunca se guarda el token en claro. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64");
}

/** Comparación en tiempo constante. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Token opaco aleatorio (32 bytes URL-safe). */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}
