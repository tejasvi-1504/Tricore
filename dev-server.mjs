/**
 * Local development server — static files + the /api serverless functions.
 *
 *   node dev-server.mjs          # http://localhost:3000
 *   PORT=4000 node dev-server.mjs
 *
 * `vercel dev` is the closest match to production, but this needs no CLI and no
 * login. It reads .env.local, mounts every api/*.js route, and shims the two
 * Vercel response helpers (res.status / res.send) the handlers use.
 *
 * Not for production — Vercel runs the real functions when deployed.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname);
const PORT = Number(process.env.PORT || 3000);

/* ── env ──────────────────────────────────────────────────────────────────── */
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    // Real env vars win, so you can override on the command line.
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
  console.log('Loaded .env.local');
} else {
  console.log('No .env.local found — API routes will run in degraded mode.');
}

/* ── routes ───────────────────────────────────────────────────────────────── */
const apiDir = path.join(ROOT, 'api');
const routes = new Map();

for (const entry of fs.readdirSync(apiDir, { withFileTypes: true })) {
  // Files and folders starting with _ are shared code, not routes — same rule
  // Vercel applies.
  if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.startsWith('_')) continue;
  const route = '/api/' + entry.name.replace(/\.js$/, '');
  const mod = await import(pathToFileURL(path.join(apiDir, entry.name)).href);
  routes.set(route, mod.default);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const started = Date.now();
  res.on('finish', () =>
    console.log(`  ${res.statusCode}  ${req.method.padEnd(4)} ${url.pathname}  ${Date.now() - started}ms`)
  );

  /* ── API ── */
  const handler = routes.get(url.pathname.replace(/\/$/, ''));
  if (handler) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      req.query = Object.fromEntries(url.searchParams);
      try {
        req.body = raw ? JSON.parse(raw) : undefined;
      } catch {
        req.body = raw;
      }
      // Vercel response shims
      res.status = (code) => { res.statusCode = code; return res; };
      const end = res.end.bind(res);
      res.send = (body) => end(body);
      try {
        await handler(req, res);
      } catch (err) {
        console.error('  handler error:', err);
        res.statusCode = 500;
        end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No such API route.' }));
  }

  /* ── static ── */
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html';

  const filePath = path.join(ROOT, rel);
  // Never serve outside the project, or anything secret.
  if (!filePath.startsWith(ROOT) || /(^|[\\/])(\.env|node_modules|\.git)/.test(rel)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>Not found. <a href="/">Go home</a></p>');
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const ok = (v) => (v ? '✓' : '✗');
  console.log(`\n  Krevol dev server  →  http://localhost:${PORT}\n`);
  console.log('  API routes:', [...routes.keys()].join('  '));
  console.log(`  ${ok(process.env.MONGODB_URI)} MongoDB   ` +
              `${ok(process.env.CASHFREE_APP_ID)} Cashfree   ` +
              `${ok(process.env.SMTP_PASS)} Email\n`);
});
