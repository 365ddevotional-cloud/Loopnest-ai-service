import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {onIdTokenChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,type User} from 'firebase/auth';
import {useQueryClient} from '@tanstack/react-query';
import {auth} from '@/lib/firebase';
type Result={success:boolean;error?:string;emailSent?:boolean};
type Value={user:User|null;loading:boolean;emailVerified:boolean;getIdToken:()=>Promise<string|null>;signIn:(e:string,p:string)=>Promise<Result>;signUp:(e:string,p:string)=>Promise<Result>;signUserOut:()=>Promise<void>;resetPassword:(e:string)=>Promise<Result>;resendVerification:()=>Promise<{sent:boolean}>;checkEmailVerified:()=>Promise<boolean>};
const Context=createContext<Value|null>(null);
const unavailable={success:false,error:'Account registration will open when the dedicated Ministrium workspace is configured.'};
export function UserProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(!!auth),[verified,setVerified]=useState(false);const qc=useQueryClient();
 useEffect(()=>{if(!auth)return;return onIdTokenChanged(auth,u=>{qc.clear();setUser(u);setVerified(!!u?.emailVerified);setLoading(false);});},[qc]);
 async function signIn(email:string,password:string){if(!auth)return unavailable;try{await signInWithEmailAndPassword(auth,email,password);return {success:true};}catch{return {success:false,error:'Could not sign in. Check your email and password.'};}}
 async function signUp(email:string,password:string){if(!auth)return unavailable;try{const c=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(c.user);return {success:true,emailSent:true};}catch{return {success:false,error:'Could not create your account. Try again or sign in.'};}}
 return <Context.Provider value={{user,loading,emailVerified:verified,getIdToken:async()=>user?.emailVerified?user.getIdToken():null,signIn,signUp,signUserOut:async()=>{if(auth)await signOut(auth);qc.clear();},resetPassword:async email=>{if(!auth)return unavailable;try{await sendPasswordResetEmail(auth,email);return {success:true};}catch{return {success:false,error:'Unable to request a reset.'};}},resendVerification:async()=>{if(!user)return {sent:false};try{await sendEmailVerification(user);return {sent:true};}catch{return {sent:false};}},checkEmailVerified:async()=>{await user?.reload();if(auth?.currentUser)await auth.currentUser.getIdToken(true);setUser(auth?.currentUser??null);setVerified(!!auth?.currentUser?.emailVerified);return !!auth?.currentUser?.emailVerified;}}}>{children}</Context.Provider>;
}
export function useUser(){const c=useContext(Context);if(!c)throw new Error('UserProvider required');return c;}
