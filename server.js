'use strict';
const express = require('express');
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { URL } = require('node:url');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '16kb', strict: true }));

function rateLimit(req, res, next) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  let item = buckets.get(ip);
  if (!item || now - item.start >= WINDOW_MS) item = { start: now, count: 0 };
  item.count++;
  buckets.set(ip, item);
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) if (now - value.start > WINDOW_MS) buckets.delete(key);
  }
  if (item.count > MAX_REQUESTS) return res.status(429).json({ error: 'طلبات كثيرة. انتظر دقيقة ثم أعد المحاولة.' });
  next();
}
app.use('/api', rateLimit);

function isPublicIPv4(ip) {
  if (net.isIP(ip) !== 4) return false;
  const n = ip.split('.').map(Number);
  const a = n[0], b = n[1], c = n[2];
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255) return false;
  return true;
}

async function validateBase(raw) {
  if (typeof raw !== 'string' || raw.length > 500) throw new Error('رابط السيرفر غير صالح.');
  let u;
  try { u = new URL(raw); } catch { throw new Error('أدخل رابط السيرفر كاملاً مثل http://host:8080'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('المسموح فقط http أو https.');
  if (u.username || u.password || u.search || u.hash) throw new Error('ضع بيانات الدخول في الحقول المخصصة، واحذف أي query أو password من الرابط.');
  if (!u.hostname || u.hostname === 'localhost' || u.hostname.endsWith('.localhost')) throw new Error('اسم المضيف غير مسموح.');
  if (net.isIP(u.hostname)) throw new Error('استخدم اسم نطاق السيرفر بدلاً من عنوان IP المباشر.');
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('منفذ السيرفر غير صالح.');
  const records = await dns.lookup(u.hostname, { all: true, family: 4, verbatim: true });
  if (!records.length || records.some(x => !isPublicIPv4(x.address))) throw new Error('عنوان السيرفر لا يشير إلى عنوان IPv4 عام مسموح.');
  return { url: u, ip: records[0].address, port };
}

function requestUpstream(base, endpoint, params, maxBytes = 12 * 1024 * 1024) {
  return new Promise(async (resolve, reject) => {
    let target;
    try { target = await validateBase(base); } catch (e) { return reject(e); }
    const { url, ip, port } = target;
    const prefix = url.pathname.replace(/\/+$/, '');
    const path = prefix + '/' + endpoint + '?' + params.toString();
    const transport = url.protocol === 'https:' ? https : http;
    const options = {
      protocol: url.protocol, hostname: url.hostname, port, method: 'GET', path,
      servername: url.hostname,
      lookup: (_hostname, _opts, cb) => cb(null, ip, 4),
      headers: { 'Accept': endpoint === 'get.php' ? '*/*' : 'application/json', 'User-Agent': 'VELNIX-Extractor/1.0', 'Connection': 'close' }
    };
    const req = transport.request(options, response => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        return reject(new Error('السيرفر أعاد تحويلة Redirect؛ لم نتبعها لأسباب أمنية.'));
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) {
          req.destroy(new Error('حجم الرد أكبر من الحد المسموح.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status: response.statusCode || 502, contentType: response.headers['content-type'] || '', body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    req.setTimeout(22_000, () => req.destroy(new Error('انتهت مهلة الاتصال بسيرفر المزوّد.')));
    req.on('error', reject);
    req.end();
  });
}

function credentials(body) {
  const username = String(body?.username || '');
  const password = String(body?.password || '');
  if (!username || !password || username.length > 160 || password.length > 300) throw new Error('أدخل اسم المستخدم وكلمة المرور بشكل صحيح.');
  return { username, password };
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'VELNIX EXTRACTOR', version: '1.0.0' }));

app.post('/api/xtream', async (req, res) => {
  try {
    const { username, password } = credentials(req.body);
    const action = String(req.body?.action || '');
    const allowed = new Set(['', 'get_live_categories', 'get_live_streams']);
    if (!allowed.has(action)) return res.status(400).json({ error: 'طلب API غير مدعوم.' });
    const params = new URLSearchParams({ username, password });
    if (action) params.set('action', action);
    const upstream = await requestUpstream(req.body?.server, 'player_api.php', params);
    if (upstream.status < 200 || upstream.status >= 300) return res.status(502).json({ error: 'سيرفر المزوّد أعاد HTTP ' + upstream.status });
    let data;
    try { data = JSON.parse(upstream.body.toString('utf8')); }
    catch { return res.status(502).json({ error: 'ردّ المزوّد ليس JSON صالحاً.' }); }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message || 'تعذر الاتصال بالسيرفر.' });
  }
});

app.post('/api/playlist', async (req, res) => {
  try {
    const { username, password } = credentials(req.body);
    const output = req.body?.output === 'm3u8' ? 'm3u8' : 'ts';
    const params = new URLSearchParams({ username, password, type: 'm3u_plus', output });
    const upstream = await requestUpstream(req.body?.server, 'get.php', params, 30 * 1024 * 1024);
    if (upstream.status < 200 || upstream.status >= 300) return res.status(502).json({ error: 'سيرفر المزوّد أعاد HTTP ' + upstream.status });
    const body = upstream.body.toString('utf8');
    if (!body.trimStart().startsWith('#EXTM3U')) return res.status(502).json({ error: 'ردّ المزوّد لا يبدو كقائمة M3U صالحة.' });
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/vnd.apple.mpegurl; charset=utf-8').send(body);
  } catch (e) {
    res.status(400).json({ error: e.message || 'تعذر تنزيل القائمة.' });
  }
});

app.use(express.static('public', { etag: true, maxAge: '1h' }));
app.get('*', (_req, res) => res.sendFile(require('node:path').join(process.cwd(), 'public', 'index.html')));
app.listen(PORT, () => process.stdout.write('VELNIX EXTRACTOR listening on ' + PORT + '\n'));
