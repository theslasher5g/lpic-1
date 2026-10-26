#!/usr/bin/env node
/* LPIC-1 Trainer — tiny zero-dependency web server.
 * Serves the static site and persists progress in SQLite (node:sqlite),
 * falling back to a JSON file when SQLite is unavailable. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'lpic1.db');
const MAX_BODY = 8 * 1024 * 1024;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

/* ---------- storage ---------- */
let store;
try {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (
      profile TEXT NOT NULL,
      key     TEXT NOT NULL,
      value   TEXT NOT NULL,
      updated INTEGER NOT NULL,
      PRIMARY KEY (profile, key)
    );`);
  const get = db.prepare('SELECT value, updated FROM kv WHERE profile = ? AND key = ?');
  const put = db.prepare('INSERT INTO kv (profile, key, value, updated) VALUES (?, ?, ?, ?) ON CONFLICT(profile, key) DO UPDATE SET value = excluded.value, updated = excluded.updated');
  const del = db.prepare('DELETE FROM kv WHERE profile = ? AND key = ?');
  const list = db.prepare('SELECT key, updated, length(value) AS size FROM kv WHERE profile = ? ORDER BY key');
  store = {
    kind: 'sqlite',
    get: (p, k) => get.get(p, k),
    put: (p, k, v) => put.run(p, k, v, Date.now()),
    del: (p, k) => del.run(p, k),
    list: (p) => list.all(p),
  };
} catch (e) {
  const file = DB_PATH.replace(/\.db$/, '') + '.json';
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    /* new store */
  }
  const flush = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(data));
    fs.renameSync(file + '.tmp', file);
  };
  store = {
    kind: 'json',
    get: (p, k) => (data[p] && data[p][k]) || undefined,
    put: (p, k, v) => {
      (data[p] = data[p] || {})[k] = { value: v, updated: Date.now() };
      flush();
    },
    del: (p, k) => {
      if (data[p]) delete data[p][k];
      flush();
    },
    list: (p) => Object.entries(data[p] || {}).map(([key, v]) => ({ key, updated: v.updated, size: v.value.length })),
  };
  console.warn(`node:sqlite not available (${e.message}); using JSON store ${file}`);
}

/* ---------- static files ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown; charset=utf-8',
};
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  // only the page itself and the assets folder are public
  if (!(rel === '/index.html' || rel.startsWith('/assets/') || rel === '/favicon.svg' || rel === '/manifest.webmanifest')) return send(res, 404, 'text/plain', 'Not found');
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'text/plain', 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'text/plain', 'Not found');
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': rel === '/index.html' ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
const json = (res, code, obj) => send(res, code, 'application/json; charset=utf-8', JSON.stringify(obj));

/* ---------- API ---------- */
function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => cb(null, Buffer.concat(chunks).toString('utf8')));
  req.on('error', (e) => cb(e));
}
function api(req, res, url) {
  const u = new URL(url, 'http://x');
  const profile = (u.searchParams.get('profile') || 'default').slice(0, 40);
  if (!/^[\w.-]+$/.test(profile)) return json(res, 400, { error: 'bad profile' });
  const parts = u.pathname.split('/').filter(Boolean); // api, kv, key
  if (parts[1] === 'health') return json(res, 200, { ok: true, store: store.kind, time: new Date().toISOString() });
  if (parts[1] !== 'kv') return json(res, 404, { error: 'not found' });
  if (!parts[2]) return json(res, 200, store.list(profile));
  const key = parts[2];
  if (!/^[a-z0-9_-]{1,40}$/.test(key)) return json(res, 400, { error: 'bad key' });
  if (req.method === 'GET') {
    const row = store.get(profile, key);
    if (!row) return json(res, 404, { error: 'no data' });
    return send(res, 200, 'application/json; charset=utf-8', row.value);
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return json(res, 400, { error: 'read error' });
      try {
        JSON.parse(body);
      } catch (e) {
        return json(res, 400, { error: 'invalid JSON' });
      }
      store.put(profile, key, body);
      json(res, 200, { ok: true, bytes: body.length });
    });
  }
  if (req.method === 'DELETE') {
    store.del(profile, key);
    return json(res, 200, { ok: true });
  }
  json(res, 405, { error: 'method not allowed' });
}

const server = http.createServer((req, res) => {
  try {
    if (req.url.startsWith('/api/')) return api(req, res, req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Method not allowed');
    serveStatic(req, res, req.url);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'internal error' });
  }
});
server.listen(PORT, HOST, () => console.log(`LPIC-1 Trainer listening on http://${HOST}:${PORT}  (store: ${store.kind}, ${DB_PATH})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
