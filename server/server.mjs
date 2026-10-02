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
const COURSE_ID = 'teb-ud1-ra1';
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
CREATE INDEX IF NOT EXISTS idx_events_student_course ON activity_events(student_id,course_id,id DESC);
`);

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
function criteria(studentId) { return db.prepare(`SELECT criterion,score,completed,attempts,updated_at AS updatedAt FROM criteria_progress WHERE student_id=? AND course_id=? ORDER BY criterion`).all(studentId, COURSE_ID); }
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'teb', courseId: COURSE_ID, time: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/api/setup-status') return json(res, 200, { needsSetup: !db.prepare('SELECT 1 FROM admins LIMIT 1').get() });

  if (req.method === 'POST' && url.pathname === '/api/setup') {
    if (db.prepare('SELECT 1 FROM admins LIMIT 1').get()) return json(res, 409, { error: 'El administrador ya está configurado.' });
    const d = await body(req), username = clean(d.username, 60), password = String(d.password || '');
    if (username.length < 3 || password.length < 10) return json(res, 400, { error: 'Usuario mínimo 3 caracteres y contraseña mínima 10 caracteres.' });
    const r = db.prepare('INSERT INTO admins(username,password_hash,created_at) VALUES(?,?,?)').run(username, hashSecret(password), new Date().toISOString());
    return json(res, 201, { token: issueSession('admin', Number(r.lastInsertRowid)), profile: { role: 'admin', username } });
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const d = await body(req);
    if (d.role === 'admin') {
      const a = db.prepare('SELECT * FROM admins WHERE username=?').get(clean(d.username, 60));
      if (!a || !verifySecret(String(d.password || ''), a.password_hash)) return json(res, 401, { error: 'Credenciales incorrectas.' });
      return json(res, 200, { token: issueSession('admin', a.id), profile: { role: 'admin', username: a.username } });
    }
    const s = db.prepare('SELECT * FROM students WHERE code=? AND active=1').get(clean(d.code, 20).toUpperCase());
    if (!s || !verifySecret(String(d.pin || ''), s.pin_hash)) return json(res, 401, { error: 'Código o PIN incorrectos.' });
    db.prepare('UPDATE students SET last_login=? WHERE id=?').run(new Date().toISOString(), s.id);
    return json(res, 200, { token: issueSession('student', s.id), profile: studentProfile(s.id) });
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    const s = auth(req); if (!s) return json(res, 401, { error: 'Sesión no válida.' });
    if (s.role === 'student') return json(res, 200, { profile: studentProfile(s.user_id) });
    const a = db.prepare('SELECT username FROM admins WHERE id=?').get(s.user_id);
    return json(res, 200, { profile: { role: 'admin', username: a.username } });
  }

  if (req.method === 'GET' && url.pathname === '/api/progress') {
    const s = auth(req, 'student'); if (!s) return json(res, 401, { error: 'Sesión no válida.' });
    const p = db.prepare('SELECT * FROM progress WHERE student_id=? AND course_id=?').get(s.user_id, COURSE_ID);
    return json(res, 200, p ? { state: JSON.parse(p.state_json), score: p.score, completion: p.completion, timeSeconds: p.time_seconds, currentSession: p.current_session, status: p.status, updatedAt: p.updated_at, criteria: criteria(s.user_id) } : { state: {}, score: 0, completion: 0, timeSeconds: 0, currentSession: 1, status: 'not-started', criteria: [] });
  }

  if (req.method === 'PUT' && url.pathname === '/api/progress') {
    const s = auth(req, 'student'); if (!s) return json(res, 401, { error: 'Sesión no válida.' });
    const d = await body(req), raw = JSON.stringify(d.state || {});
    if (raw.length > 200000) return json(res, 400, { error: 'Estado demasiado grande.' });
    const score = Math.max(0, Math.min(100, Number(d.score) || 0));
    const completion = Math.max(0, Math.min(100, Number(d.completion) || 0));
    const timeSeconds = Math.max(0, Math.min(14 * 3600 * 3, Number(d.timeSeconds) || 0));
    const currentSession = Math.max(1, Math.min(14, Number(d.currentSession) || 1));
    const status = ['not-started','incomplete','passed','failed','completed'].includes(d.status) ? d.status : 'incomplete';
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO progress(student_id,course_id,course_version,state_json,score,completion,time_seconds,current_session,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET course_version=excluded.course_version,state_json=excluded.state_json,score=excluded.score,completion=excluded.completion,time_seconds=excluded.time_seconds,current_session=excluded.current_session,status=excluded.status,updated_at=excluded.updated_at`).run(s.user_id, COURSE_ID, clean(d.version, 30), raw, score, completion, timeSeconds, currentSession, status, now);
    return json(res, 200, { ok: true, updatedAt: now });
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    const s = auth(req, 'student'); if (!s) return json(res, 401, { error: 'Sesión no válida.' });
    const d = await body(req), criterion = clean(d.criterion, 16), ref = clean(d.ref, 80), eventType = clean(d.eventType, 40), score = d.score == null ? null : Math.max(0, Math.min(100, Number(d.score) || 0));
    const now = new Date().toISOString();
    db.prepare('INSERT INTO activity_events(student_id,course_id,event_type,ref,criterion,score,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(s.user_id, COURSE_ID, eventType, ref, criterion, score, JSON.stringify(d.payload || {}), now);
    if (/^RA1\.[a-g]$/.test(criterion) && score != null) {
      const completed = score >= 70 ? 1 : 0;
      db.prepare(`INSERT INTO criteria_progress(student_id,course_id,criterion,score,completed,attempts,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(student_id,course_id,criterion) DO UPDATE SET score=MAX(criteria_progress.score,excluded.score),completed=MAX(criteria_progress.completed,excluded.completed),attempts=criteria_progress.attempts+1,updated_at=excluded.updated_at`).run(s.user_id, COURSE_ID, criterion, score, completed, now);
    }
    return json(res, 201, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/groups') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    return json(res, 200, { groups: db.prepare('SELECT id,name,active,created_at AS createdAt,updated_at AS updatedAt FROM groups_tbl ORDER BY name').all() });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/groups') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const d = await body(req), name = clean(d.name, 80); if (!name) return json(res, 400, { error: 'Nombre requerido.' });
    const now = new Date().toISOString();
    try { const r = db.prepare('INSERT INTO groups_tbl(name,active,created_at,updated_at) VALUES(?,1,?,?)').run(name, now, now); return json(res, 201, { id: Number(r.lastInsertRowid), name, active: 1 }); } catch { return json(res, 409, { error: 'Ya existe un grupo con ese nombre.' }); }
  }
  let m = routeMatch(url.pathname, '/api/admin/groups/:id');
  if (m && req.method === 'PUT') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const d = await body(req), name = clean(d.name, 80), active = d.active === false || d.active === 0 ? 0 : 1;
    if (!name) return json(res, 400, { error: 'Nombre requerido.' });
    db.prepare('UPDATE groups_tbl SET name=?,active=?,updated_at=? WHERE id=?').run(name, active, new Date().toISOString(), Number(m.id));
    return json(res, 200, { ok: true });
  }
  if (m && req.method === 'DELETE') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    db.prepare('UPDATE students SET group_id=NULL,updated_at=? WHERE group_id=?').run(new Date().toISOString(), Number(m.id));
    db.prepare('DELETE FROM groups_tbl WHERE id=?').run(Number(m.id));
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/students') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const rows = db.prepare(`SELECT s.id,s.code,s.first_name AS firstName,s.last_name AS lastName,s.active,s.last_login AS lastLogin,g.id AS groupId,g.name AS groupName,p.score,p.completion,p.time_seconds AS timeSeconds,p.current_session AS currentSession,p.status,p.updated_at AS progressUpdated FROM students s LEFT JOIN groups_tbl g ON g.id=s.group_id LEFT JOIN progress p ON p.student_id=s.id AND p.course_id=? ORDER BY COALESCE(g.name,''),s.last_name,s.first_name`).all(COURSE_ID);
    return json(res, 200, { students: rows.map(r => ({ ...r, criteria: criteria(r.id) })) });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/students') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const d = await body(req), first = clean(d.firstName, 60), last = clean(d.lastName, 100), pin = String(d.pin || '1234'), groupId = d.groupId ? Number(d.groupId) : null;
    if (first.length < 2 || last.length < 2 || !/^[0-9]{4,8}$/.test(pin)) return json(res, 400, { error: 'Revisa nombre, apellidos y PIN (4-8 cifras).' });
    const now = new Date().toISOString(), code = makeCode();
    const r = db.prepare('INSERT INTO students(code,first_name,last_name,group_id,pin_hash,active,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)').run(code, first, last, groupId, hashSecret(pin), now, now);
    return json(res, 201, { student: studentProfile(Number(r.lastInsertRowid)), temporaryPin: pin });
  }
  m = routeMatch(url.pathname, '/api/admin/students/:id');
  if (m && req.method === 'PUT') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const d = await body(req), first = clean(d.firstName, 60), last = clean(d.lastName, 100), groupId = d.groupId ? Number(d.groupId) : null, active = d.active === false || d.active === 0 ? 0 : 1;
    if (first.length < 2 || last.length < 2) return json(res, 400, { error: 'Nombre y apellidos requeridos.' });
    db.prepare('UPDATE students SET first_name=?,last_name=?,group_id=?,active=?,updated_at=? WHERE id=?').run(first, last, groupId, active, new Date().toISOString(), Number(m.id));
    return json(res, 200, { ok: true, student: studentProfile(Number(m.id)) });
  }
  if (m && req.method === 'DELETE') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    db.prepare('DELETE FROM students WHERE id=?').run(Number(m.id));
    return json(res, 200, { ok: true });
  }
  m = routeMatch(url.pathname, '/api/admin/students/:id/reset-pin');
  if (m && req.method === 'POST') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const d = await body(req), pin = String(d.pin || '1234');
    if (!/^[0-9]{4,8}$/.test(pin)) return json(res, 400, { error: 'PIN de 4 a 8 cifras.' });
    db.prepare('UPDATE students SET pin_hash=?,updated_at=? WHERE id=?').run(hashSecret(pin), new Date().toISOString(), Number(m.id));
    return json(res, 200, { ok: true, temporaryPin: pin });
  }
  m = routeMatch(url.pathname, '/api/admin/students/:id/events');
  if (m && req.method === 'GET') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const events = db.prepare(`SELECT event_type AS eventType,ref,criterion,score,payload_json AS payload,created_at AS createdAt FROM activity_events WHERE student_id=? AND course_id=? ORDER BY id DESC LIMIT 200`).all(Number(m.id), COURSE_ID).map(e => ({ ...e, payload: JSON.parse(e.payload || '{}') }));
    return json(res, 200, { events });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/export.csv') {
    if (!auth(req, 'admin')) return json(res, 401, { error: 'Acceso de administración requerido.' });
    const rows = db.prepare(`SELECT s.code,s.first_name,s.last_name,g.name AS group_name,p.score,p.completion,p.time_seconds,p.current_session,p.status,p.updated_at FROM students s LEFT JOIN groups_tbl g ON g.id=s.group_id LEFT JOIN progress p ON p.student_id=s.id AND p.course_id=? ORDER BY COALESCE(g.name,''),s.last_name`).all(COURSE_ID);
    const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = 'Código,Nombre,Apellidos,Grupo,Puntuación,Progreso,Tiempo_seg,Sesión,Estado,Actualizado\n' + rows.map(r => [r.code,r.first_name,r.last_name,r.group_name,r.score,r.completion,r.time_seconds,r.current_session,r.status,r.updated_at].map(esc).join(',')).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="TEB_UD1_seguimiento.csv"' });
    return res.end('\ufeff' + csv);
  }

  return json(res, 404, { error: 'Ruta no encontrada.' });
}

function staticFile(res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  if (p.includes('..')) return false;
  const file = resolve(WEB_DIR, '.' + p);
  if (!file.startsWith(WEB_DIR) || !existsSync(file) || !statSync(file).isFile()) return false;
  const type = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.svg':'image/svg+xml' }[extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public,max-age=900' });
  createReadStream(file).pipe(res); return true;
}

const limiter = new Map();
const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const ip = req.socket.remoteAddress || 'unknown', now = Date.now();
  const hits = (limiter.get(ip) || []).filter(t => now - t < 60000); hits.push(now); limiter.set(ip, hits);
  if (hits.length > 300) return json(res, 429, { error: 'Demasiadas solicitudes.' });
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (!staticFile(res, url.pathname)) json(res, 404, { error: 'Archivo no encontrado.' });
  } catch (e) { console.error(e); json(res, 500, { error: 'Error interno del servidor.' }); }
});
server.listen(PORT, HOST, () => console.log(`TEB disponible en http://${HOST}:${PORT}`));
