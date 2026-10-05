import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, extname, resolve } from 'node:path';

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const p = line.indexOf('=');
    const key = line.slice(0, p).trim();
    const value = line.slice(p + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(join(import.meta.dirname, '.env'));

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = resolve(process.env.DATA_DIR || join(import.meta.dirname, 'data'));
const WEB_DIR = resolve(import.meta.dirname, '../web');
const SESSION_MS = Number(process.env.SESSION_HOURS || 168) * 3600000;
const DEFAULT_COURSE_ID = 'teb-ud1-ra1';
const COURSES = {
  'teb-ud1-ra1': { id:'teb-ud1-ra1', unit:'UD1', ra:'RA1', title:'El patrimonio empresarial en Canarias', hours:14, maxSessions:14, criteria:/^RA1\.[a-g]$/, portfolioWeight:1, examWeight:0 },
  'teb-ud2-ra2': { id:'teb-ud2-ra2', unit:'UD2', ra:'RA2', title:'La lógica de la contabilidad: cuenta y partida doble', hours:20, maxSessions:20, criteria:/^RA2\.[a-i]$/, portfolioWeight:.60, examWeight:.40 }
};
const RA2_WEIGHTS = { 'RA2.a':.10,'RA2.b':.10,'RA2.c':.125,'RA2.d':.125,'RA2.e':.10,'RA2.f':.10,'RA2.g':.10,'RA2.h':.10,'RA2.i':.15 };
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'teb.sqlite'));
db.exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS groups_tbl(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, group_id INTEGER, pin_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login TEXT, FOREIGN KEY(group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, role TEXT NOT NULL, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS progress(id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, course_id TEXT NOT NULL, course_version TEXT, state_json TEXT NOT NULL DEFAULT '{}', score REAL NOT NULL DEFAULT 0, completion REAL NOT NULL DEFAULT 0, time_seconds INTEGER NOT NULL DEFAULT 0, current_session INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'not-started', updated_at TEXT NOT NULL, UNIQUE(student_id,course_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS criteria_progress(id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, course_id TEXT NOT NULL, criterion TEXT NOT NULL, score REAL NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, UNIQUE(student_id,course_id,criterion), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS activity_events(id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, course_id TEXT NOT NULL, event_type TEXT NOT NULL, ref TEXT, criterion TEXT, score REAL, payload_json TEXT, created_at TEXT NOT NULL, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS assessment_components(id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, course_id TEXT NOT NULL, instrument TEXT NOT NULL, criterion TEXT NOT NULL, score REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 1, payload_json TEXT, updated_at TEXT NOT NULL, UNIQUE(student_id,course_id,instrument,criterion), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS course_settings(course_id TEXT PRIMARY KEY, exam_enabled INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_student_course ON activity_events(student_id,course_id,id DESC);
CREATE INDEX IF NOT EXISTS idx_components_student_course ON assessment_components(student_id,course_id,instrument,criterion);
`);
for (const id of Object.keys(COURSES)) db.prepare('INSERT OR IGNORE INTO course_settings(course_id,exam_enabled,updated_at) VALUES(?,0,?)').run(id,new Date().toISOString());

function clean(v, max = 120) { return String(v ?? '').trim().replace(/[<>]/g, '').slice(0, max); }
function hashSecret(secret) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(secret, salt, 32).toString('hex')}`; }
function verifySecret(secret, stored) { try { const [salt, hex] = stored.split(':'); return timingSafeEqual(scryptSync(secret, salt, 32), Buffer.from(hex, 'hex')); } catch { return false; } }
function tokenHash(t) { return createHash('sha256').update(t).digest('hex'); }
function issueSession(role, userId) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions(token_hash,role,user_id,expires_at,created_at) VALUES(?,?,?,?,?)').run(tokenHash(token), role, userId, Date.now() + SESSION_MS, new Date().toISOString());
  return token;
}
function auth(req, role = null) {
  const raw = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!raw) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(tokenHash(raw), Date.now());
  if (!s || (role && s.role !== role)) return null;
  return s;
}
function routeMatch(path, pattern) {
  const a = path.split('/').filter(Boolean), b = pattern.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < b.length; i++) {
    if (b[i].startsWith(':')) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) { let raw = ''; for await (const c of req) { raw += c; if (raw.length > 1024 * 1024) throw new Error('Solicitud demasiado grande'); } return raw ? JSON.parse(raw) : {}; }
function makeCode() { let code; do { code = `TEB-${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`; } while (db.prepare('SELECT 1 FROM students WHERE code=?').get(code)); return code; }
function studentProfile(id) { return db.prepare(`SELECT s.id,s.code,s.first_name AS firstName,s.last_name AS lastName,s.active,g.id AS groupId,g.name AS groupName FROM students s LEFT JOIN groups_tbl g ON g.id=s.group_id WHERE s.id=?`).get(id); }
function courseIdFrom(url, d = {}) { const id = clean(d.courseId || url.searchParams.get('courseId') || DEFAULT_COURSE_ID, 40); return COURSES[id] ? id : null; }
function criteria(studentId, courseId) { return db.prepare(`SELECT criterion,score,completed,attempts,updated_at AS updatedAt FROM criteria_progress WHERE student_id=? AND course_id=? ORDER BY criterion`).all(studentId, courseId); }
function settings(courseId) { return db.prepare('SELECT course_id AS courseId,exam_enabled AS examEnabled,updated_at AS updatedAt FROM course_settings WHERE course_id=?').get(courseId) || { courseId, examEnabled:0 }; }
function componentRows(studentId, courseId) { return db.prepare(`SELECT instrument,criterion,score,attempts,payload_json AS payload,updated_at AS updatedAt FROM assessment_components WHERE student_id=? AND course_id=? ORDER BY criterion,instrument`).all(studentId,courseId).map(x=>({...x,payload:JSON.parse(x.payload||'{}')})); }
function componentMap(studentId, courseId) { const map={}; for(const x of componentRows(studentId,courseId)){ map[x.criterion]=map[x.criterion]||{}; map[x.criterion][x.instrument]=x; } return map; }
function finalCriterionScores(studentId, courseId) {
  if (courseId !== 'teb-ud2-ra2') return Object.fromEntries(criteria(studentId,courseId).map(x=>[x.criterion,{score:x.score,passed:x.score>=50,complete:true}]));
  const map=componentMap(studentId,courseId), out={};
  for(const ce of Object.keys(RA2_WEIGHTS)){
    const p=map[ce]?.portfolio?.score, e=map[ce]?.exam?.score;
    const complete=Number.isFinite(p)&&Number.isFinite(e);
    const score=complete ? p*.60+e*.40 : (Number.isFinite(p)?p*.60:Number.isFinite(e)?e*.40:0);
    out[ce]={score:Number(score.toFixed(2)),passed:complete&&score>=50,complete,portfolio:Number.isFinite(p)?p:null,exam:Number.isFinite(e)?e:null};
  }
  return out;
}
function refreshCriteriaFromComponents(studentId, courseId) {
  if (courseId !== 'teb-ud2-ra2') return;
  const finals=finalCriterionScores(studentId,courseId), components=componentMap(studentId,courseId), now=new Date().toISOString();
  for(const [ce,x] of Object.entries(finals)){
    const attempts=(components[ce]?.portfolio?.attempts||0)+(components[ce]?.exam?.attempts||0);
    db.prepare(`INSERT INTO criteria_progress(student_id,course_id,criterion,score,completed,attempts,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,course_id,criterion) DO UPDATE SET score=excluded.score,completed=excluded.completed,attempts=excluded.attempts,updated_at=excluded.updated_at`).run(studentId,courseId,ce,x.score,x.passed?1:0,attempts,now);
  }
}
function recoveryPlan(studentId, courseId) {
  const finals=finalCriterionScores(studentId,courseId);
  const errorRows=db.prepare(`SELECT criterion,payload_json AS payload,score,ref,event_type AS eventType,created_at AS createdAt FROM activity_events WHERE student_id=? AND course_id=? AND criterion<>'' ORDER BY id DESC LIMIT 500`).all(studentId,courseId);
  const labels={
    'RA2.a':'Reconstruir y ordenar las fases del ciclo contable.', 'RA2.b':'Identificar la cuenta adecuada para representar cada elemento o hecho.', 'RA2.c':'Aplicar correctamente la partida doble y la contrapartida.', 'RA2.d':'Reforzar cargo/abono y la decisión Debe/Haber.', 'RA2.e':'Construir y utilizar el balance de comprobación para detectar incidencias.', 'RA2.f':'Distinguir y registrar correctamente ingresos y gastos.', 'RA2.g':'Calcular e interpretar el resultado contable.', 'RA2.h':'Comprender y aplicar apertura y cierre.', 'RA2.i':'Distinguir la función del Balance, Pérdidas y Ganancias y Memoria.'
  };
  const items=[];
  for(const [ce,x] of Object.entries(finals)){
    if(x.passed) continue;
    const errors=[];
    for(const r of errorRows.filter(r=>r.criterion===ce)){
      let p={}; try{p=JSON.parse(r.payload||'{}')}catch{}
      const t=clean(p.errorType || p.diagnostic || p.reason || '',100); if(t&&!errors.includes(t)) errors.push(t);
      if(errors.length>=4) break;
    }
    const activityCount = ce==='RA2.d'||ce==='RA2.c' ? 12 : ce==='RA2.e'||ce==='RA2.i' ? 10 : 8;
    items.push({criterion:ce,currentScore:x.score,portfolio:x.portfolio??null,exam:x.exam??null,objective:labels[ce]||`Reforzar ${ce}.`,diagnostics:errors,proposal:{microactivities:activityCount,unseen:true,masteryCheck:5,caseRequired:['RA2.c','RA2.d','RA2.e','RA2.f','RA2.g'].includes(ce)}});
  }
  return {courseId,generatedAt:new Date().toISOString(),passed:Object.values(finals).filter(x=>x.passed).length,total:Object.keys(finals).length,pending:items};
}
function courseProgress(studentId, courseId) {
  const p=db.prepare('SELECT * FROM progress WHERE student_id=? AND course_id=?').get(studentId,courseId);
  return p ? { state:JSON.parse(p.state_json),score:p.score,completion:p.completion,timeSeconds:p.time_seconds,currentSession:p.current_session,status:p.status,updatedAt:p.updated_at,criteria:criteria(studentId,courseId),components:componentRows(studentId,courseId),criterionFinals:finalCriterionScores(studentId,courseId) } : { state:{},score:0,completion:0,timeSeconds:0,currentSession:1,status:'not-started',criteria:[],components:[],criterionFinals:finalCriterionScores(studentId,courseId) };
}
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok:true,service:'teb',courses:Object.values(COURSES).map(({criteria,...x})=>x),time:new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/api/courses') return json(res,200,{courses:Object.values(COURSES).map(({criteria,...x})=>({...x,...settings(x.id)}))});
  if (req.method === 'GET' && url.pathname === '/api/setup-status') return json(res, 200, { needsSetup: !db.prepare('SELECT 1 FROM admins LIMIT 1').get() });

  if (req.method === 'POST' && url.pathname === '/api/setup') {
    if (db.prepare('SELECT 1 FROM admins LIMIT 1').get()) return json(res, 409, { error:'El administrador ya está configurado.' });
    const d=await body(req), username=clean(d.username,60), password=String(d.password||'');
    if(username.length<3||password.length<10)return json(res,400,{error:'Usuario mínimo 3 caracteres y contraseña mínima 10 caracteres.'});
    const r=db.prepare('INSERT INTO admins(username,password_hash,created_at) VALUES(?,?,?)').run(username,hashSecret(password),new Date().toISOString());
    return json(res,201,{token:issueSession('admin',Number(r.lastInsertRowid)),profile:{role:'admin',username}});
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const d=await body(req);
    if(d.role==='admin'){
      const a=db.prepare('SELECT * FROM admins WHERE username=?').get(clean(d.username,60));
      if(!a||!verifySecret(String(d.password||''),a.password_hash))return json(res,401,{error:'Credenciales incorrectas.'});
      return json(res,200,{token:issueSession('admin',a.id),profile:{role:'admin',username:a.username}});
    }
    const s=db.prepare('SELECT * FROM students WHERE code=? AND active=1').get(clean(d.code,20).toUpperCase());
    if(!s||!verifySecret(String(d.pin||''),s.pin_hash))return json(res,401,{error:'Código o PIN incorrectos.'});
    db.prepare('UPDATE students SET last_login=? WHERE id=?').run(new Date().toISOString(),s.id);
    return json(res,200,{token:issueSession('student',s.id),profile:studentProfile(s.id)});
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    const s=auth(req); if(!s)return json(res,401,{error:'Sesión no válida.'});
    if(s.role==='student')return json(res,200,{profile:studentProfile(s.user_id)});
    const a=db.prepare('SELECT username FROM admins WHERE id=?').get(s.user_id); return json(res,200,{profile:{role:'admin',username:a.username}});
  }

  if (req.method === 'GET' && url.pathname === '/api/course-settings') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'});
    const courseId=courseIdFrom(url); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    return json(res,200,settings(courseId));
  }

  if (req.method === 'GET' && url.pathname === '/api/progress') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'});
    const courseId=courseIdFrom(url); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    return json(res,200,courseProgress(s.user_id,courseId));
  }

  if (req.method === 'PUT' && url.pathname === '/api/progress') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'});
    const d=await body(req), courseId=courseIdFrom(url,d); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    const cfg=COURSES[courseId], raw=JSON.stringify(d.state||{}); if(raw.length>350000)return json(res,400,{error:'Estado demasiado grande.'});
    const score=Math.max(0,Math.min(100,Number(d.score)||0)), completion=Math.max(0,Math.min(100,Number(d.completion)||0));
    const timeSeconds=Math.max(0,Math.min(cfg.hours*3600*5,Number(d.timeSeconds)||0));
    const currentSession=Math.max(1,Math.min(cfg.maxSessions,Number(d.currentSession)||1));
    const status=['not-started','incomplete','passed','failed','completed'].includes(d.status)?d.status:'incomplete', now=new Date().toISOString();
    db.prepare(`INSERT INTO progress(student_id,course_id,course_version,state_json,score,completion,time_seconds,current_session,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET course_version=excluded.course_version,state_json=excluded.state_json,score=excluded.score,completion=excluded.completion,time_seconds=excluded.time_seconds,current_session=excluded.current_session,status=excluded.status,updated_at=excluded.updated_at`).run(s.user_id,courseId,clean(d.version,30),raw,score,completion,timeSeconds,currentSession,status,now);
    return json(res,200,{ok:true,courseId,updatedAt:now});
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'});
    const d=await body(req), courseId=courseIdFrom(url,d); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    const criterion=clean(d.criterion,16), ref=clean(d.ref,80), eventType=clean(d.eventType,40), score=d.score==null?null:Math.max(0,Math.min(100,Number(d.score)||0)), now=new Date().toISOString();
    db.prepare('INSERT INTO activity_events(student_id,course_id,event_type,ref,criterion,score,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(s.user_id,courseId,eventType,ref,criterion,score,JSON.stringify(d.payload||{}),now);
    if(COURSES[courseId].criteria.test(criterion)&&score!=null&&courseId!=='teb-ud2-ra2'){
      const completed=score>=50?1:0;
      db.prepare(`INSERT INTO criteria_progress(student_id,course_id,criterion,score,completed,attempts,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(student_id,course_id,criterion) DO UPDATE SET score=MAX(criteria_progress.score,excluded.score),completed=MAX(criteria_progress.completed,excluded.completed),attempts=criteria_progress.attempts+1,updated_at=excluded.updated_at`).run(s.user_id,courseId,criterion,score,completed,now);
    }
    return json(res,201,{ok:true,courseId});
  }

  if (req.method === 'POST' && url.pathname === '/api/assessment') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'});
    const d=await body(req), courseId=courseIdFrom(url,d); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    if(courseId!=='teb-ud2-ra2')return json(res,400,{error:'Esta API de instrumentos está configurada para RA2.'});
    const instrument=clean(d.instrument,20); if(!['portfolio','exam'].includes(instrument))return json(res,400,{error:'Instrumento no válido.'});
    if(instrument==='exam'&&!settings(courseId).examEnabled)return json(res,403,{error:'El examen todavía no ha sido activado por el profesor.'});
    const scores=d.criteria||{}, now=new Date().toISOString();
    for(const ce of Object.keys(RA2_WEIGHTS)){
      if(scores[ce]==null)continue; const sc=Math.max(0,Math.min(100,Number(scores[ce])||0));
      db.prepare(`INSERT INTO assessment_components(student_id,course_id,instrument,criterion,score,attempts,payload_json,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(student_id,course_id,instrument,criterion) DO UPDATE SET score=excluded.score,attempts=assessment_components.attempts+1,payload_json=excluded.payload_json,updated_at=excluded.updated_at`).run(s.user_id,courseId,instrument,ce,sc,JSON.stringify(d.payload||{}),now);
      db.prepare('INSERT INTO activity_events(student_id,course_id,event_type,ref,criterion,score,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(s.user_id,courseId,`${instrument}-criterion`,clean(d.ref||instrument,80),ce,sc,JSON.stringify(d.payload||{}),now);
    }
    refreshCriteriaFromComponents(s.user_id,courseId);
    const finals=finalCriterionScores(s.user_id,courseId); const overall=Object.entries(RA2_WEIGHTS).reduce((a,[ce,w])=>a+(finals[ce]?.score||0)*w,0);
    return json(res,201,{ok:true,courseId,instrument,overall:Number(overall.toFixed(2)),criteria:finals,recovery:recoveryPlan(s.user_id,courseId)});
  }

  if (req.method === 'GET' && url.pathname === '/api/recovery') {
    const s=auth(req,'student'); if(!s)return json(res,401,{error:'Sesión no válida.'}); const courseId=courseIdFrom(url); if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    return json(res,200,recoveryPlan(s.user_id,courseId));
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/groups') {
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});
    return json(res,200,{groups:db.prepare('SELECT id,name,active,created_at AS createdAt,updated_at AS updatedAt FROM groups_tbl ORDER BY name').all()});
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/groups') {
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'}); const d=await body(req),name=clean(d.name,80); if(!name)return json(res,400,{error:'Nombre requerido.'}); const now=new Date().toISOString();
    try{const r=db.prepare('INSERT INTO groups_tbl(name,active,created_at,updated_at) VALUES(?,1,?,?)').run(name,now,now);return json(res,201,{id:Number(r.lastInsertRowid),name,active:1});}catch{return json(res,409,{error:'Ya existe un grupo con ese nombre.'})}
  }
  let m=routeMatch(url.pathname,'/api/admin/groups/:id');
  if(m&&req.method==='PUT'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'}); const d=await body(req),name=clean(d.name,80),active=d.active===false||d.active===0?0:1;if(!name)return json(res,400,{error:'Nombre requerido.'}); db.prepare('UPDATE groups_tbl SET name=?,active=?,updated_at=? WHERE id=?').run(name,active,new Date().toISOString(),Number(m.id));return json(res,200,{ok:true});
  }
  if(m&&req.method==='DELETE'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'}); db.prepare('UPDATE students SET group_id=NULL,updated_at=? WHERE group_id=?').run(new Date().toISOString(),Number(m.id));db.prepare('DELETE FROM groups_tbl WHERE id=?').run(Number(m.id));return json(res,200,{ok:true});
  }

  if(req.method==='GET'&&url.pathname==='/api/admin/students'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});
    const rows=db.prepare(`SELECT s.id,s.code,s.first_name AS firstName,s.last_name AS lastName,s.active,s.last_login AS lastLogin,g.id AS groupId,g.name AS groupName FROM students s LEFT JOIN groups_tbl g ON g.id=s.group_id ORDER BY COALESCE(g.name,''),s.last_name,s.first_name`).all();
    const students=rows.map(r=>({...r,courses:Object.fromEntries(Object.keys(COURSES).map(cid=>[cid,courseProgress(r.id,cid)]))}));
    return json(res,200,{students,courses:Object.values(COURSES).map(({criteria,...x})=>x)});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/students'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'}); const d=await body(req),first=clean(d.firstName,60),last=clean(d.lastName,100),pin=String(d.pin||'1234'),groupId=d.groupId?Number(d.groupId):null;if(first.length<2||last.length<2||!/^[0-9]{4,8}$/.test(pin))return json(res,400,{error:'Revisa nombre, apellidos y PIN (4-8 cifras).'});const now=new Date().toISOString(),code=makeCode();const r=db.prepare('INSERT INTO students(code,first_name,last_name,group_id,pin_hash,active,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)').run(code,first,last,groupId,hashSecret(pin),now,now);return json(res,201,{student:studentProfile(Number(r.lastInsertRowid)),temporaryPin:pin});
  }
  m=routeMatch(url.pathname,'/api/admin/students/:id');
  if(m&&req.method==='PUT'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const d=await body(req),first=clean(d.firstName,60),last=clean(d.lastName,100),groupId=d.groupId?Number(d.groupId):null,active=d.active===false||d.active===0?0:1;if(first.length<2||last.length<2)return json(res,400,{error:'Nombre y apellidos requeridos.'});db.prepare('UPDATE students SET first_name=?,last_name=?,group_id=?,active=?,updated_at=? WHERE id=?').run(first,last,groupId,active,new Date().toISOString(),Number(m.id));return json(res,200,{ok:true,student:studentProfile(Number(m.id))});
  }
  if(m&&req.method==='DELETE'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});db.prepare('DELETE FROM students WHERE id=?').run(Number(m.id));return json(res,200,{ok:true});
  }
  m=routeMatch(url.pathname,'/api/admin/students/:id/reset-pin');
  if(m&&req.method==='POST'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const d=await body(req),pin=String(d.pin||'1234');if(!/^[0-9]{4,8}$/.test(pin))return json(res,400,{error:'PIN de 4 a 8 cifras.'});db.prepare('UPDATE students SET pin_hash=?,updated_at=? WHERE id=?').run(hashSecret(pin),new Date().toISOString(),Number(m.id));return json(res,200,{ok:true,temporaryPin:pin});
  }
  m=routeMatch(url.pathname,'/api/admin/students/:id/events');
  if(m&&req.method==='GET'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const courseId=courseIdFrom(url);if(!courseId)return json(res,400,{error:'Unidad no válida.'});const events=db.prepare(`SELECT event_type AS eventType,ref,criterion,score,payload_json AS payload,created_at AS createdAt FROM activity_events WHERE student_id=? AND course_id=? ORDER BY id DESC LIMIT 300`).all(Number(m.id),courseId).map(e=>({...e,payload:JSON.parse(e.payload||'{}')}));return json(res,200,{courseId,events});
  }
  m=routeMatch(url.pathname,'/api/admin/students/:id/recovery');
  if(m&&req.method==='GET'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const courseId=courseIdFrom(url);if(!courseId)return json(res,400,{error:'Unidad no válida.'});return json(res,200,recoveryPlan(Number(m.id),courseId));
  }
  m=routeMatch(url.pathname,'/api/admin/course-settings/:courseId');
  if(m&&req.method==='PUT'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const courseId=clean(m.courseId,40);if(!COURSES[courseId])return json(res,400,{error:'Unidad no válida.'});const d=await body(req),examEnabled=d.examEnabled?1:0,now=new Date().toISOString();db.prepare(`INSERT INTO course_settings(course_id,exam_enabled,updated_at) VALUES(?,?,?) ON CONFLICT(course_id) DO UPDATE SET exam_enabled=excluded.exam_enabled,updated_at=excluded.updated_at`).run(courseId,examEnabled,now);return json(res,200,{...settings(courseId),examEnabled:!!examEnabled});
  }

  if(req.method==='GET'&&url.pathname==='/api/admin/export.csv'){
    if(!auth(req,'admin'))return json(res,401,{error:'Acceso de administración requerido.'});const courseId=courseIdFrom(url);if(!courseId)return json(res,400,{error:'Unidad no válida.'});
    const rows=db.prepare(`SELECT s.id,s.code,s.first_name,s.last_name,g.name AS group_name,p.score,p.completion,p.time_seconds,p.current_session,p.status,p.updated_at FROM students s LEFT JOIN groups_tbl g ON g.id=s.group_id LEFT JOIN progress p ON p.student_id=s.id AND p.course_id=? ORDER BY COALESCE(g.name,''),s.last_name`).all(courseId);
    const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const header=['Código','Nombre','Apellidos','Grupo','Puntuación','Progreso','Tiempo_seg','Sesión','Estado','Actualizado'];if(courseId==='teb-ud2-ra2')header.push(...Object.keys(RA2_WEIGHTS));
    const csv=header.map(esc).join(',')+'\n'+rows.map(r=>{const base=[r.code,r.first_name,r.last_name,r.group_name,r.score,r.completion,r.time_seconds,r.current_session,r.status,r.updated_at];if(courseId==='teb-ud2-ra2'){const f=finalCriterionScores(r.id,courseId);base.push(...Object.keys(RA2_WEIGHTS).map(ce=>f[ce]?.score??0));}return base.map(esc).join(',')}).join('\n');
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="TEB_${COURSES[courseId].unit}_seguimiento.csv"`});return res.end('\ufeff'+csv);
  }

  return json(res,404,{error:'Ruta no encontrada.'});
}

function staticFile(res, pathname) {
  let p=pathname==='/'?'/index.html':pathname; if(p.includes('..'))return false; const file=resolve(WEB_DIR,'.'+p); if(!file.startsWith(WEB_DIR)||!existsSync(file)||!statSync(file).isFile())return false;
  const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':extname(file)==='.html'?'no-cache':'public,max-age=900'});createReadStream(file).pipe(res);return true;
}
const limiter=new Map();
const server=http.createServer(async(req,res)=>{cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}const ip=req.socket.remoteAddress||'unknown',now=Date.now();const hits=(limiter.get(ip)||[]).filter(t=>now-t<60000);hits.push(now);limiter.set(ip,hits);if(hits.length>300)return json(res,429,{error:'Demasiadas solicitudes.'});const url=new URL(req.url,'http://localhost');try{if(url.pathname.startsWith('/api/'))return await api(req,res,url);if(!staticFile(res,url.pathname))json(res,404,{error:'Archivo no encontrado.'})}catch(e){console.error(e);json(res,500,{error:'Error interno del servidor.'})}});
server.listen(PORT,HOST,()=>console.log(`TEB disponible en http://${HOST}:${PORT}`));
