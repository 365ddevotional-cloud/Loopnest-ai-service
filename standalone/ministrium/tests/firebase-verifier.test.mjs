import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createFirebaseVerifier} from '../server/firebase-verifier.mjs';
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const cert=pair.publicKey.export({type:'spki',format:'pem'});
const now=Math.floor(Date.now()/1000);
const claims={iss:'https://securetoken.google.com/ministrium-test',aud:'ministrium-test',sub:'test-person',iat:now-10,exp:now+3600,email:'person@example.com',email_verified:true};
function jwt(changes={},header={alg:'RS256',kid:'test-key'},key=pair.privateKey){
 const body=[header,{...claims,...changes}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
 return `${body}.${sign('RSA-SHA256',Buffer.from(body),key).toString('base64url')}`;
}
function verifier(){return createFirebaseVerifier({projectId:'ministrium-test',fetchCertificates:async()=>({ok:true,json:async()=>({'test-key':cert})})});}

test('valid signed Firebase claims yield a verified identity and certificates are cached',async()=>{
 let calls=0;
 const verify=createFirebaseVerifier({projectId:'ministrium-test',fetchCertificates:async()=>{calls++;return {ok:true,json:async()=>({'test-key':cert})};}});
 const user=await verify(jwt());assert.equal(user.uid,'test-person');assert.equal(user.email_verified,true);
 await verify(jwt());assert.equal(calls,1);
});
test('rejects wrong project, issuer, expired claims and unverified or missing email',async()=>{
 const verify=verifier();
 for(const changes of [{aud:'devotional-project'},{iss:'https://securetoken.google.com/devotional-project'},{iat:now-8000,exp:now-4000},{email_verified:false},{email:undefined},{sub:''},{sub:'x'.repeat(129)}])await assert.rejects(verify(jwt(changes)));
});
test('rejects forged signatures, unsigned algorithms and malformed tokens',async()=>{
 const verify=verifier();const other=generateKeyPairSync('rsa',{modulusLength:2048});
 await assert.rejects(verify(jwt({},undefined,other.privateKey)));
 await assert.rejects(verify(jwt({},{alg:'none',kid:'test-key'})));
 await assert.rejects(verify(jwt({},{alg:'RS256',kid:'unrecognized'})));
 await assert.rejects(verify('malformed'));
});
test('certificate service failure fails closed without caching the failed response',async()=>{
 let calls=0;
 const verify=createFirebaseVerifier({projectId:'ministrium-test',fetchCertificates:async()=>++calls===1?{ok:false}:{ok:true,json:async()=>({'test-key':cert})}});
 await assert.rejects(verify(jwt()),/Cannot verify identity/);
 assert.equal((await verify(jwt())).uid,'test-person');assert.equal(calls,2);
});
