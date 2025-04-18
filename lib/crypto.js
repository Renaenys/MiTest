import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = process.env.ENCRYPTION_KEY; // Must be 32 characters exactly.
if (!key || key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be defined in .env.local and be 32 characters long");
}
const ivLength = 16; // AES block size

export function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, "utf8"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Return string in the form "iv:encrypted"
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text) {
  const parts = text.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, "utf8"), iv);
  let decrypted;
  try {
    decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
  } catch (error) {
    console.error("Decryption failed. Encrypted text:", text);
    throw error;
  }
  return decrypted;
}
