require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = Number(process.env.PORT || 3000);
const environments = ['Development', 'Testing', 'Production'];
const statuses = ['IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK'];
app.use(express.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname, 'public')));
const clean = (v, max=255) => v == null ? null : String(v).trim().slice(0,max) || null;
function validate(b, partial=false) {
  const errors=[];
  if (!partial) for (const k of ['project_name','version','build_number']) if (!String(b[k]||'').trim()) errors.push(`${k} is required`);
  if (b.environment && !environments.includes(b.environment)) errors.push(`environment must be ${environments.join(', ')}`);
  if (b.status && !statuses.includes(b.status)) errors.push(`status must be ${statuses.join(', ')}`);
  return errors;
}
app.get('/api/health', async (req,res) => { try { await db.query('SELECT 1'); res.json({status:'ok',database:'connected'}); } catch(e) { res.status(503).json({status:'error',database:'unavailable'}); } });
app.get('/api/deployments', async (req,res) => {
 try {
  const filters=[], vals=[];
  if(req.query.status){filters.push('status=?');vals.push(req.query.status)}
  if(req.query.environment){filters.push('environment=?');vals.push(req.query.environment)}
  if(req.query.project){filters.push('project_name LIKE ?');vals.push('%'+req.query.project+'%')}
  const limit=Math.min(Math.max(parseInt(req.query.limit,10)||100,1),500);
  const [rows]=await db.query(`SELECT * FROM deployments ${filters.length?'WHERE '+filters.join(' AND '):''} ORDER BY started_at DESC,id DESC LIMIT ${limit}`,vals);res.json(rows);
 } catch(e){console.error(e.message);res.status(500).json({error:'Could not retrieve deployments'});}
});
app.get('/api/deployments/:id', async(req,res)=>{try{const [r]=await db.query('SELECT * FROM deployments WHERE id=?',[req.params.id]);if(!r.length)return res.status(404).json({error:'Deployment not found'});res.json(r[0]);}catch(e){res.status(500).json({error:'Could not retrieve deployment'});}});
app.post('/api/deployments', async(req,res)=>{
 const errors=validate(req.body);if(errors.length)return res.status(400).json({errors});const b=req.body;const status=b.status||'IN_PROGRESS';
 try{const [r]=await db.query(`INSERT INTO deployments(project_name,version,build_number,environment,status,deployed_by,image_tag,commit_id,logs,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,[clean(b.project_name,120),clean(b.version,80),clean(b.build_number,80),b.environment||'Development',status,clean(b.deployed_by,120)||'manual',clean(b.image_tag),clean(b.commit_id,80),clean(b.logs,60000),b.finished_at||(status==='IN_PROGRESS'?null:new Date())]);const [rows]=await db.query('SELECT * FROM deployments WHERE id=?',[r.insertId]);res.status(201).json(rows[0]);}catch(e){console.error(e.message);res.status(500).json({error:'Could not create deployment'});}
});
app.put('/api/deployments/:id', async(req,res)=>{
 const errors=validate(req.body,true);if(errors.length)return res.status(400).json({errors});const allowed=['project_name','version','build_number','environment','status','deployed_by','image_tag','commit_id','logs','finished_at'];const updates=[],values=[];
 for(const k of allowed)if(Object.hasOwn(req.body,k)){updates.push(`${k}=?`);values.push(k==='logs'?clean(req.body[k],60000):clean(req.body[k],255));}
 if(!updates.length)return res.status(400).json({error:'No supported fields supplied'});if(req.body.status&&req.body.status!=='IN_PROGRESS'&&!req.body.finished_at)updates.push('finished_at=COALESCE(finished_at,CURRENT_TIMESTAMP)');values.push(req.params.id);
 try{await db.query(`UPDATE deployments SET ${updates.join(',')} WHERE id=?`,values);const [rows]=await db.query('SELECT * FROM deployments WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).json({error:'Deployment not found'});res.json(rows[0]);}catch(e){console.error(e.message);res.status(500).json({error:'Could not update deployment'});}
});
app.delete('/api/deployments/:id',async(req,res)=>{try{const [r]=await db.query('DELETE FROM deployments WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Deployment not found'});res.json({message:'Deployment deleted'});}catch(e){res.status(500).json({error:'Could not delete deployment'});}});
app.post('/api/jenkins/deployments',async(req,res)=>{
 if(!process.env.TRACKER_API_KEY||req.get('x-tracker-api-key')!==process.env.TRACKER_API_KEY)return res.status(401).json({error:'Unauthorized'});
 const errors=validate(req.body);if(errors.length)return res.status(400).json({errors});const b=req.body;const externalId=clean(b.external_id,190);if(!externalId)return res.status(400).json({error:'external_id is required'});const status=b.status||'IN_PROGRESS';
 try{await db.query(`INSERT INTO deployments(external_id,project_name,version,build_number,environment,status,deployed_by,image_tag,commit_id,logs,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE project_name=VALUES(project_name),version=VALUES(version),build_number=VALUES(build_number),environment=VALUES(environment),status=VALUES(status),deployed_by=VALUES(deployed_by),image_tag=VALUES(image_tag),commit_id=VALUES(commit_id),logs=VALUES(logs),finished_at=VALUES(finished_at)`,[externalId,clean(b.project_name,120),clean(b.version,80),clean(b.build_number,80),b.environment||'Development',status,clean(b.deployed_by,120)||'jenkins',clean(b.image_tag),clean(b.commit_id,80),clean(b.logs,60000),b.finished_at||(status==='IN_PROGRESS'?null:new Date())]);const [rows]=await db.query('SELECT * FROM deployments WHERE external_id=?',[externalId]);res.json(rows[0]);}catch(e){console.error(e.message);res.status(500).json({error:'Could not save Jenkins deployment'});}
});
if(require.main===module)app.listen(PORT,'0.0.0.0',()=>console.log(`Deployment Tracker listening on ${PORT}`));
module.exports=app;
