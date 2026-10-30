import {OAuth2Client} from 'google-auth-library';
const certificateUrl='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// Production always uses Google's fixed certificate URL; tests inject a local signing key.
export function createFirebaseVerifier({projectId,fetchCertificates=()=>fetch(certificateUrl,{signal:AbortSignal.timeout(10000)})}){
 const verifier=new OAuth2Client();let cache;
 return async token=>{
  const project=typeof projectId==='function'?projectId():projectId;
  if(typeof project!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project))throw new Error('Dedicated Firebase project not configured.');
  if(typeof token!=='string'||token.length>8192)throw new Error('Invalid identity token.');
  let header;
  try{const parts=token.split('.');if(parts.length!==3)throw new Error();header=JSON.parse(Buffer.from(parts[0],'base64url').toString());}catch{throw new Error('Invalid identity token.');}
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>128)throw new Error('Invalid identity signature.');
  if(!cache||Date.now()>cache.until){
   const response=await fetchCertificates();
   if(!response.ok)throw new Error('Cannot verify identity right now.');
   const certs=await response.json();
   if(!certs||typeof certs!=='object'||Array.isArray(certs)||Object.values(certs).some(value=>typeof value!=='string'))throw new Error('Invalid identity certificates.');
   cache={certs,until:Date.now()+300000};
  }
  const ticket=await verifier.verifySignedJwtWithCertsAsync(token,cache.certs,project,[`https://securetoken.google.com/${project}`]);
  const payload=ticket.getPayload();
  if(!payload||payload.aud!==project||typeof payload.sub!=='string'||!payload.sub.length||payload.sub.length>128)throw new Error('Invalid identity claims.');
  if(payload.email_verified!==true||typeof payload.email!=='string'||payload.email.length>254||!/^\S+@\S+\.\S+$/.test(payload.email))throw new Error('Verify your email before accessing a ministry.');
  return {...payload,uid:payload.sub};
 };
}
