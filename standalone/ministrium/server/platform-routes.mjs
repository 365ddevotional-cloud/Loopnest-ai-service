export function registerPlatformRoutes(app,admin,wrap){
 app.get('/api/platform-admin/access',wrap(async(_req,res,user)=>res.json(await admin.access(user))));
 app.get('/api/platform-admin/overview',wrap(async(_req,res,user)=>res.json(await admin.overview(user))));
 app.get('/api/platform-admin/workspaces',wrap(async(req,res,user)=>res.json(await admin.workspaces(user,req.query.after))));
 app.post('/api/platform-admin/workspaces/:organizationId/status',wrap(async(req,res,user)=>res.json(await admin.suspend(user,req.params.organizationId,req.body))));
 app.get('/api/platform-admin/reports',wrap(async(req,res,user)=>res.json(await admin.reports(user,req.query.closed==='true',req.query.after))));
 app.post('/api/platform-admin/reports/:reportId/resolution',wrap(async(req,res,user)=>res.json(await admin.resolve(user,req.params.reportId,req.body))));
 app.get('/api/platform-admin/audit',wrap(async(req,res,user)=>res.json(await admin.audit(user,req.query.after))));
 app.post('/api/moderation/reports',wrap(async(req,res,user)=>res.status(201).json(await admin.submitReport(user,req.body))));
 app.get('/api/moderation/reports',wrap(async(_req,res,user)=>res.json(await admin.myReports(user))));
}
