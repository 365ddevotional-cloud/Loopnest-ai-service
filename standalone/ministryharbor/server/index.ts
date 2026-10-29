import express from 'express';
import path from 'node:path';
import {isChurchApi,isBlockedFinance,runtimeMode} from './policy.mjs';
async function main(){
const mode=runtimeMode(process.env);
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'256kb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,app:'MinistryHarbor',version:'0.1.0',mode,paymentsEnabled:false}));
app.get('/api/platform/status',(_req,res)=>res.json({mode,accountsEnabled:mode==='workspace',paymentsEnabled:false,uploadsEnabled:false,emailEnabled:false}));
app.use('/api',(req,res,next)=>{
 const pathname=req.originalUrl.split('?')[0];
 if(isBlockedFinance(pathname,req.method))return res.status(503).json({message:'Live payments and payout configuration are not enabled in this foundation build.'});
 if(!isChurchApi(pathname))return res.status(404).json({message:'This endpoint is not part of MinistryHarbor.'});
 if(mode==='preview')return res.status(503).json({message:'The independent ministry workspace is not connected yet. Explore /preview for sample data.'});
 res.setHeader('Cache-Control','no-store');next();
});
if(mode==='workspace'){
 // Import database code only after the explicit separate-database guard succeeds.
 process.env.DATABASE_URL=process.env.MINISTRYHARBOR_DATABASE_URL;
 const {pool}=await import('../source/server/db');
 await pool.query('SELECT 1');
 const {registerChurchRoutes}=await import('../source/server/church-routes');
 registerChurchRoutes(app);
}
app.use('/api',(_req,res)=>res.status(404).json({message:'Endpoint not found.'}));
const publicDir=path.resolve(process.cwd(),'dist/public');
app.use(express.static(publicDir,{index:false}));
app.get('*',(_req,res)=>res.sendFile(path.join(publicDir,'index.html')));
app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error('MinistryHarbor request failed:',error.message);res.status(500).json({message:'Unable to complete this request.'});});
const port=process.env.PORT===undefined?8080:Number(process.env.PORT);
const server=app.listen(port,'0.0.0.0',()=>{const address=server.address();console.log(`MinistryHarbor listening on ${typeof address==='object'&&address?address.port:port} (${mode}; live payments disabled)`);});
}
main().catch(error=>{console.error('MinistryHarbor could not start:',error.message);process.exitCode=1;});
