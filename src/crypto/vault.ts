export async function encrypt(
  key: CryptoKey,
  data: ArrayBuffer
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return { encrypted, iv };
}

export async function decrypt(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
    key,
    encrypted
  );
}

export async function encryptString(
  key: CryptoKey,
  text: string
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const encoder = new TextEncoder();
  return encrypt(key, encoder.encode(text).buffer as ArrayBuffer);
}

export async function decryptString(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await decrypt(key, encrypted, iv);
  return new TextDecoder().decode(decrypted);
}

export function ivToBase64(iv: Uint8Array): string {
  return btoa(String.fromCharCode(...iv));
}

export function base64ToIv(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
