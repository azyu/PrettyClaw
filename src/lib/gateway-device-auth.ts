import type { StoredDeviceAuth, StoredDeviceIdentity, StoredDeviceToken } from "@/types";

const DEVICE_IDENTITY_STORAGE_KEY = "openclaw-device-identity-v1";
const DEVICE_AUTH_STORAGE_KEY = "openclaw.device.auth.v1";
const ED25519_ALGORITHM = "Ed25519";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getSubtleCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("crypto.subtle is unavailable");
  }
  return crypto.subtle;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await getSubtleCrypto().digest("SHA-256", toArrayBuffer(bytes));
  return bytesToHex(new Uint8Array(digest));
}

function readStoredDeviceIdentity(): StoredDeviceIdentity | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDeviceIdentity> | null;
    if (
      parsed?.version !== 1 ||
      typeof parsed.deviceId !== "string" ||
      typeof parsed.publicKey !== "string" ||
      typeof parsed.privateKey !== "string"
    ) {
      return null;
    }

    return {
      version: 1,
      deviceId: parsed.deviceId,
      publicKey: parsed.publicKey,
      privateKey: parsed.privateKey,
      createdAtMs: typeof parsed.createdAtMs === "number" ? parsed.createdAtMs : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStoredDeviceIdentity(identity: StoredDeviceIdentity) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DEVICE_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
}

async function generateDeviceIdentity(): Promise<StoredDeviceIdentity> {
  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey(ED25519_ALGORITHM, true, ["sign", "verify"]);
  const publicKey = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
  const privateKey = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));

  return {
    version: 1,
    deviceId: await sha256Hex(publicKey),
    publicKey: encodeBase64Url(publicKey),
    privateKey: encodeBase64Url(privateKey),
    createdAtMs: Date.now(),
  };
}

function normalizeRole(role: string) {
  return role.trim();
}

function readStoredDeviceAuth(): StoredDeviceAuth | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(DEVICE_AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDeviceAuth> | null;
    if (
      parsed?.version !== 1 ||
      typeof parsed.deviceId !== "string" ||
      !parsed.tokens ||
      typeof parsed.tokens !== "object"
    ) {
      return null;
    }

    return {
      version: 1,
      deviceId: parsed.deviceId,
      tokens: parsed.tokens as Record<string, StoredDeviceToken>,
    };
  } catch {
    return null;
  }
}

function writeStoredDeviceAuth(auth: StoredDeviceAuth) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DEVICE_AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function canUseDeviceIdentity() {
  return typeof window !== "undefined" && window.isSecureContext && typeof crypto !== "undefined" && !!crypto.subtle;
}

export async function loadOrCreateDeviceIdentity(): Promise<StoredDeviceIdentity> {
  const stored = readStoredDeviceIdentity();
  if (stored) {
    const deviceId = await sha256Hex(decodeBase64Url(stored.publicKey));
    if (deviceId !== stored.deviceId) {
      const corrected = { ...stored, deviceId };
      writeStoredDeviceIdentity(corrected);
      return corrected;
    }
    return stored;
  }

  const created = await generateDeviceIdentity();
  writeStoredDeviceIdentity(created);
  return created;
}

export function getStoredDeviceToken(deviceId: string, role: string): StoredDeviceToken | null {
  const auth = readStoredDeviceAuth();
  if (!auth || auth.deviceId !== deviceId) return null;

  const token = auth.tokens[normalizeRole(role)];
  return token && typeof token.token === "string" ? token : null;
}

export function setStoredDeviceToken(deviceId: string, role: string, token: string, scopes: string[]) {
  const normalizedRole = normalizeRole(role);
  const current = readStoredDeviceAuth();
  const next: StoredDeviceAuth = {
    version: 1,
    deviceId,
    tokens: current?.deviceId === deviceId && current.tokens ? { ...current.tokens } : {},
  };

  next.tokens[normalizedRole] = {
    token,
    role: normalizedRole,
    scopes: Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean))).sort(),
    updatedAtMs: Date.now(),
  };

  writeStoredDeviceAuth(next);
}

export function clearStoredDeviceToken(deviceId: string, role: string) {
  const current = readStoredDeviceAuth();
  if (!current || current.deviceId !== deviceId) return;

  const normalizedRole = normalizeRole(role);
  if (!current.tokens[normalizedRole]) return;

  const next: StoredDeviceAuth = {
    version: 1,
    deviceId: current.deviceId,
    tokens: { ...current.tokens },
  };
  delete next.tokens[normalizedRole];
  writeStoredDeviceAuth(next);
}

export function createConnectSignaturePayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
}) {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
  ].join("|");
}

export async function signConnectPayload(privateKey: string, payload: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const key = await subtle.importKey(
    "pkcs8",
    toArrayBuffer(decodeBase64Url(privateKey)),
    ED25519_ALGORITHM,
    false,
    ["sign"],
  );
  const signature = await subtle.sign(
    ED25519_ALGORITHM,
    key,
    toArrayBuffer(new TextEncoder().encode(payload)),
  );
  return encodeBase64Url(new Uint8Array(signature));
}
