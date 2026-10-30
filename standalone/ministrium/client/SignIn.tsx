import {useState,type FormEvent} from 'react';
import {Link,useLocation} from 'wouter';
import {useUser} from '@/contexts/UserContext';
import {authConfigured} from '@/lib/firebase';
import {useQuery} from '@tanstack/react-query';
import {platformStatus} from './workspace-api';

function GoogleMark(){return <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.9-.4-4.3H24v8.1h11c-.5 2.6-2 4.8-4.2 6.3v5.2h6.8c4-3.7 6-9.1 6-15.3Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.8-5.2c-1.9 1.3-4.1 2-6.7 2-5.2 0-9.6-3.5-11.2-8.3H5.8V33c3.4 6.7 10.2 11 18.2 11Z"/><path fill="#FBBC05" d="M12.8 27.6a12.1 12.1 0 0 1 0-7.7v-5.4H5.8a20 20 0 0 0 0 18.5l7-5.4Z"/><path fill="#EA4335" d="M24 11.6c3 0 5.6 1 7.7 3l5.9-5.9C34 5.4 29.3 3.6 24 3.6c-8 0-14.8 4.3-18.2 10.9l7 5.4c1.6-4.8 6-8.3 11.2-8.3Z"/></svg>;}

export default function SignIn({onSuccess}:{onSuccess?:()=>void}={}){
 const {signIn,signInWithGoogle,signUp,user,emailVerified,resendVerification,checkEmailVerified,signUserOut,resetPassword}=useUser();
 const status=useQuery({queryKey:['platform-status'],queryFn:platformStatus});
 const accountsReady=authConfigured&&status.data?.accountsEnabled===true;
 const [,go]=useLocation();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[create,setCreate]=useState(false);
 const finishSignIn=()=>onSuccess?onSuccess():go('/workspace');

 async function submit(e:FormEvent){
  e.preventDefault();if(!accountsReady)return;setBusy(true);setError('');
  try{const r=await(create?signUp:signIn)(email,password);if(r.success)create&&r.emailSent?setError('Account created. Check your email to verify it before signing in.'):finishSignIn();else setError(r.error??'Please try again.');}
  finally{setBusy(false);}
 }
 async function googleSignIn(){
  if(!accountsReady)return;setBusy(true);setError('');
  try{const r=await signInWithGoogle();if(r.success)finishSignIn();else setError(r.error??'Please try Google sign-in again.');}
  finally{setBusy(false);}
 }
 async function forgotPassword(){
  if(!email.trim()){setError('Enter your email address above, then choose Forgot password?');return;}
  setBusy(true);setError('');
  try{const r=await resetPassword(email.trim());setError(r.success?'If an account exists for that email, a password reset link has been sent.':r.error??'Unable to request a reset.');}
  finally{setBusy(false);}
 }

 return <main className="mh-auth">
  <Link href="/" className="mh-wordmark"><img src="/icon.svg" alt=""/><span className="mh-wordmark-type"><strong>Ministrium</strong><small>CHURCH · MINISTRY · COMMUNITY</small></span></Link>
  <h1>{user&&!emailVerified?'Verify your email':create?'Begin your ministry’s next chapter':'Welcome back'}</h1>
  <p>One account. A home for your ministry and community.</p>
  {!accountsReady?<div role="status" className="mh-notice">Account access will open when the separate Ministrium workspace is ready. No account details are collected here.</div>:user&&!emailVerified?
   <div className="mh-actions"><button onClick={async()=>{setError((await resendVerification()).sent?'Verification email sent.':'Unable to send email.');}}>Resend verification</button><button onClick={async()=>{if(await checkEmailVerified())finishSignIn();else setError('Your email is not verified yet.');}}>I have verified</button><button onClick={()=>signUserOut()}>Sign out</button></div>:user?
   <div className="mh-actions"><button className="mh-button" onClick={finishSignIn}>Open your workspaces →</button><button onClick={()=>signUserOut()}>Sign out</button></div>:
   <>
    <button type="button" className="mh-google-button" onClick={googleSignIn} disabled={busy}><GoogleMark/>{busy?'Please wait…':create?'Continue with Google':'Sign in with Google'}</button>
    <div className="mh-auth-divider"><span>or use email</span></div>
    <form onSubmit={submit}>
     <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label>Password<input type="password" autoComplete={create?'new-password':'current-password'} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
     {!create&&<button type="button" className="mh-forgot-link" onClick={forgotPassword} disabled={busy}>Forgot password?</button>}
     <button className="mh-button" disabled={busy}>{busy?'Please wait…':create?'Create account':'Sign in'}</button>
     <button type="button" className="mh-auth-toggle" onClick={()=>{setError('');setCreate(!create);}}>{create?'Already have an account? Sign in':'Create an account'}</button>
    </form>
   </>}
  {error&&<p role="status" className="mh-auth-message">{error}</p>}
  <Link href="/preview">Explore the sample workspace →</Link>
 </main>;
}
