import {useUser} from '@/contexts/UserContext';
export type Organization={id:string;name:string;slug:string;kind:'church'|'ministry'|'both'|'group';groupType:'family'|'prayer'|'discipleship'|null;country:string;city:string;role:'owner'|'admin'|'member';suspended?:boolean};
export type OrganizationDraft=Pick<Organization,'name'|'slug'|'kind'|'groupType'|'country'|'city'>;
export type PlatformStatus={mode:'preview'|'workspace';workspacesEnabled:boolean;accountsEnabled:boolean};
export function useWorkspaceApi(){
 const {getIdToken}=useUser();
 return async<T,>(path:string,method='GET',body?:unknown):Promise<T>=>{
  const token=await getIdToken();
  if(!token)throw new Error('Sign in with a verified email to continue.');
  const response=await fetch(path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.message||'Unable to complete your request.');
  return data;
 };
}
export async function platformStatus():Promise<PlatformStatus>{
 const response=await fetch('/api/platform/status');
 if(!response.ok)throw new Error('Unable to check workspace availability.');
 return response.json();
}
