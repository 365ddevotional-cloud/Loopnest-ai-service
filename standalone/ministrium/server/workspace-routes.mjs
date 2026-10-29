import {WorkspaceError, createWorkspaceService} from './workspaces.mjs';

export function registerWorkspaceRoutes(app, db, verifyToken) {
  const service=createWorkspaceService(db);
  // Bounded, process-local pilot limiter. Use a shared limiter before multiple replicas.
  const windows=new Map();
  const wrap=handler=>async(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    let user;
    try {
      const header=req.headers.authorization;
      if(typeof header!=='string'||!header.startsWith('Bearer ')||header.length>8192)throw new Error('Missing token');
      user=await verifyToken(header.slice(7));
      if(!user.uid||!user.email||user.email_verified!==true)throw new Error('Unverified identity');
    }catch{return res.status(401).json({message:'Sign in and verify your email to continue.'});}
    const now=Date.now(), key=user.uid;
    if(windows.size>10000)for(const [uid,w]of windows)if(w.until<=now)windows.delete(uid);
    let window=windows.get(key);
    if(!window||window.until<=now){window={until:now+60000,count:0};windows.set(key,window);}
    if(++window.count>60){res.setHeader('Retry-After','60');return res.status(429).json({message:'Please wait a minute before trying again.'});}
    try{return await handler(req,res,user);}catch(error){
      if(error instanceof WorkspaceError)return res.status(error.status).json({message:error.message});
      next(error);
    }
  };
  app.get('/api/workspaces',wrap(async(_req,res,user)=>res.json(await service.list(user))));
  app.post('/api/workspaces',wrap(async(req,res,user)=>res.status(201).json(await service.create(user,req.body))));
  app.post('/api/workspaces/join',wrap(async(req,res,user)=>{
    if(!req.body||Object.keys(req.body).some(k=>k!=='token'))throw new WorkspaceError(400,'Only an invitation token is accepted.');
    res.json(await service.join(user,req.body.token));
  }));
  app.get('/api/workspaces/:id',wrap(async(req,res,user)=>res.json(await service.detail(user,req.params.id))));
  app.get('/api/workspaces/:id/members',wrap(async(req,res,user)=>res.json(await service.members(user,req.params.id))));
  app.get('/api/workspaces/:id/invitations',wrap(async(req,res,user)=>res.json(await service.invitations(user,req.params.id))));
  app.post('/api/workspaces/:id/invitations',wrap(async(req,res,user)=>res.status(201).json(await service.invite(user,req.params.id,req.body))));
  app.delete('/api/workspaces/:id/invitations/:invitationId',wrap(async(req,res,user)=>res.json(await service.revoke(user,req.params.id,req.params.invitationId))));
}
