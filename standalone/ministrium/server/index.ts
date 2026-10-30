import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import {assertWorkspaceIdentity} from './deployment-config.mjs';
import {migrationChecksum} from './migrations.mjs';
import {isChurchApi,isWorkspaceApi,isBlockedFinance,runtimeMode} from './policy.mjs';
async function main(){
const mode=runtimeMode(process.env);
if(mode==='workspace'){
 const identity=JSON.parse(await fs.readFile(path.resolve(process.cwd(),'dist/identity.json'),'utf8'));
 assertWorkspaceIdentity(process.env,identity);
}
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'256kb'}));
app.use((_req,res,next)=>{res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');next();});
app.get('/api/health',(_req,res)=>res.json({ok:true,app:'Ministrium',version:'0.2.0',mode,paymentsEnabled:false}));
app.get('/api/platform/status',(_req,res)=>res.json({mode,accountsEnabled:mode==='workspace',workspacesEnabled:mode==='workspace',legacyChurchEnabled:false,paymentsEnabled:false,uploadsEnabled:false,emailEnabled:false}));
app.use('/api',(req,res,next)=>{
 const pathname=req.originalUrl.split('?')[0];
 if(isBlockedFinance(pathname,req.method))return res.status(503).json({message:'Live payments and payout configuration are not enabled in this foundation build.'});
 if(!isChurchApi(pathname)&&!isWorkspaceApi(pathname))return res.status(404).json({message:'This endpoint is not part of Ministrium.'});
 if(isChurchApi(pathname))return res.status(503).json({message:'Legacy Church Mode is staged for migration. Use the new Ministrium workspace.'});
 if(mode==='preview')return res.status(503).json({message:'The independent ministry workspace is not connected yet. Explore /preview for sample data.'});
 res.setHeader('Cache-Control','no-store');next();
});
if(mode==='workspace'){
 const {createDatabase}=await import('./database.mjs');
 const db=createDatabase(process.env.MINISTRIUM_DATABASE_URL);
 // Never auto-migrate or initialize the devotional database.
 try{
  for(const [index,file] of ['001_workspaces.sql','002_community.sql','003_ministry_tools.sql'].entries()){
   const migration=await db.query('SELECT checksum FROM ministrium.migrations WHERE version=$1',[index+1]);
   const sql=await fs.readFile(path.resolve(process.cwd(),'migrations',file),'utf8');
   if(migration.rows[0]?.checksum!==migrationChecksum(sql))throw new Error('Run or verify the explicit Ministrium migrations before starting workspace mode.');
  }
 }catch(error){await db.close();throw error;}
 const {registerWorkspaceRoutes}=await import('./workspace-routes.mjs');
 const {auth}=await import('./firebase-admin');
 registerWorkspaceRoutes(app,db,(token:string)=>auth.verifyIdToken(token));
}
app.use('/api',(_req,res)=>res.status(404).json({message:'Endpoint not found.'}));
const publicDir=path.resolve(process.cwd(),'dist/public');
app.use(express.static(publicDir,{index:false}));
app.get('*',(_req,res)=>res.sendFile(path.join(publicDir,'index.html')));
app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error('Ministrium request failed:',error.message);res.status(500).json({message:'Unable to complete this request.'});});
const port=process.env.PORT===undefined?8080:Number(process.env.PORT);
const server=app.listen(port,'0.0.0.0',()=>{const address=server.address();console.log(`Ministrium listening on ${typeof address==='object'&&address?address.port:port} (${mode}; live payments disabled)`);});
}
main().catch(error=>{console.error('Ministrium could not start:',error.message);process.exitCode=1;});
