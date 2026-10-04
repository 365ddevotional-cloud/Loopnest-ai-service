import { OAuth2Client } from "google-auth-library";

const FIREBASE_CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
// Match the authoritative client configuration in client/src/lib/firebase.ts.
// Legacy VITE_FIREBASE_PROJECT_ID settings belong to an older project.
const FIREBASE_PROJECT_ID = "loopnest-app";

let _certCache: { certs: Record<string, string>; expiry: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (_certCache && Date.now() < _certCache.expiry) return _certCache.certs;
  const resp = await fetch(FIREBASE_CERT_URL);
  if (!resp.ok) throw new Error("Firebase signing certificates are unavailable.");
  const certs = (await resp.json()) as Record<string, string>;
  _certCache = { certs, expiry: Date.now() + 3_600_000 };
  return certs;
}

export const auth = {
  async verifyIdToken(idToken: string): Promise<{ uid: string; [key: string]: any }> {
    const certs = await getCerts();
    const client = new OAuth2Client();
    const ticket = await (client as any).verifySignedJwtWithCertsAsync(
      idToken,
      certs,
      FIREBASE_PROJECT_ID,
      [`https://securetoken.google.com/${FIREBASE_PROJECT_ID}`]
    );
    const payload = ticket.getPayload() as Record<string, any>;
    return { ...payload, uid: payload.sub as string };
  },
};
