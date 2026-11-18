import { createHash, createSign, createPrivateKey } from "node:crypto";
import { AUDIO_VOICE } from "../shared/shop-audiobook";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function narrationConfig(env: NodeJS.ProcessEnv) {
  const cap = Number(env.SHOP_AUDIO_CHARACTER_BUDGET ?? 0);
  try {
    const account = JSON.parse(env.SHOP_AUDIO_GOOGLE_SERVICE_ACCOUNT_JSON ?? "{}");
    if (env.SHOP_AUDIO_ENABLED !== "true" || !Number.isSafeInteger(cap) || cap < 1 || cap > 10000000 ||
      typeof account.client_email !== "string" || typeof account.private_key !== "string" || !account.project_id) return null;
    if (createPrivateKey(account.private_key).asymmetricKeyType !== "rsa") return null;
    return { account, cap };
  } catch { return null; }
}

// A failed or timed-out request may already have been billed. The caller records
// it as failed and never retries synthesis automatically.
export function googleNarrator(env: NodeJS.ProcessEnv) {
  let token: { value: string; expires: number } | undefined;
  return async (text: string) => {
    const config = narrationConfig(env);
    if (!config || Buffer.byteLength(text) > 4500 || !text.trim()) throw new Error("Narration unavailable");
    if (!token || token.expires < Date.now() + 60000) {
      const now = Math.floor(Date.now() / 1000);
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
        iss: config.account.client_email, scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
      })}`;
      const signature = createSign("RSA-SHA256").update(unsigned).sign(config.account.private_key, "base64url");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
      });
      if (!response.ok) throw new Error("Narration authentication unavailable");
      const data = await response.json();
      if (typeof data.access_token !== "string") throw new Error("Invalid narration authentication");
      token = { value: data.access_token, expires: Date.now() + 3500000 };
    }
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST", signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/json", "x-goog-user-project": config.account.project_id },
      body: JSON.stringify({ input: { text }, voice: { name: AUDIO_VOICE, languageCode: "en-US" }, audioConfig: { audioEncoding: "MP3" } }),
    });
    if (!response.ok) throw new Error("Narration generation unavailable");
    const data = await response.json();
    if (typeof data.audioContent !== "string") throw new Error("Missing narration");
    const bytes = Buffer.from(data.audioContent, "base64");
    if (bytes.length < 100 || bytes.length > 10000000) throw new Error("Invalid narration size");
    if (!(bytes.subarray(0,3).toString() === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) throw new Error("Invalid narration format");
    return bytes;
  };
}

type CacheStore = {
  read(id: string): Promise<{ status: string; object_key: string | null } | undefined>;
  claim(id: string): Promise<boolean>;
  ready(id: string, key: string): Promise<void>;
  failed(id: string): Promise<void>;
  save(key: string, bytes: Buffer): Promise<void>;
};
export function createAudioCache(store: CacheStore, synthesize: (text: string) => Promise<Buffer>) {
  return async (editionId: string, paragraphId: string, text: string, allowGeneration: boolean) => {
    const id = hash(JSON.stringify(["google-chirp3-hd-v1", AUDIO_VOICE, editionId, paragraphId, text]));
    const existing = await store.read(id);
    if (existing?.status === "ready" && existing.object_key) return { key: existing.object_key };
    if (existing?.status === "failed") throw Object.assign(new Error("This passage needs a recording repair. Your purchase remains available."), { status: 409 });
    if (existing || !allowGeneration) return { pending: true };
    if (!await store.claim(id)) return { pending: true };
    try {
      const bytes = await synthesize(text);
      const key = `shop-audio/${id}.mp3`;
      await store.save(key, bytes);
      await store.ready(id, key);
      return { key };
    } catch (error) {
      await store.failed(id);
      throw error;
    }
  };
}
