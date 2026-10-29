import { OAuth2Client } from 'google-auth-library';
const verifier = new OAuth2Client();
let cache: { certs: Record<string,string>; until: number } | undefined;
export const auth = {
  async verifyIdToken(token: string): Promise<{uid:string;[key:string]:any}> {
    const project = process.env.MH_FIREBASE_PROJECT_ID;
    if(!project) throw new Error('Dedicated Firebase project not configured.');
    if(!cache || Date.now()>cache.until){
      const response=await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
      if(!response.ok)throw new Error('Cannot verify identity.');
      cache={certs:await response.json() as Record<string,string>,until:Date.now()+300000};
    }
    const ticket=await (verifier as any).verifySignedJwtWithCertsAsync(token,cache.certs,project,[`https://securetoken.google.com/${project}`]);
    const payload=ticket.getPayload();
    if(!payload?.sub || payload.email_verified!==true)throw new Error('Verify your email before accessing a ministry.');
    return {...payload,uid:payload.sub};
  }
};
