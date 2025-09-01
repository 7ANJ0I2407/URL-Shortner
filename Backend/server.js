import express from 'express';
import { nanoid } from 'nanoid';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import 'dotenv/config';

import connectDB from './Connection/DB.js';
import Url from './Schemas/MongoDB.js';
import { validateUrl } from './utils/validateUrl.js';
import { UAParser } from 'ua-parser-js';

const app = express();
const port = process.env.PORT || 8080;

// --- DB
connectDB();


// env like: CORS_ORIGINS=http://localhost:5173,https://short-url-rust-iota.vercel.app
const rawOrigins = process.env.CORS_ORIGINS || '';
const allowList = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

// allow *.vercel.app previews too
function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true); // allow same-origin / server-to-server
  try {
    const host = new URL(origin).hostname;
    if (allowList.includes(origin) || host.endsWith('.vercel.app')) {
      return cb(null, true);
    }
  } catch {}
  return cb(new Error('Not allowed by CORS'));
}

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false // keep false unless you use cookies
}));

// Make sure OPTIONS preflight doesn’t 404
app.options('*', cors());


// --- Security & middleware
app.set('trust proxy', true); // important when behind proxies (Render, Vercel)
app.use(helmet({
  contentSecurityPolicy: false, // keep simple; adjust if you serve HTML (password form)
}));
app.use(morgan('combined'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Rate limits (tweak for your traffic)
const shortenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // up to 30 shorten requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
const redirectLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 100, // 100 redirects per 10s per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Helpers
function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (typeof xfwd === 'string') return xfwd.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

function simplifyUA(uaString) {
  const deviceInfo = new UAParser(uaString || '').getResult();
  return `${deviceInfo.os?.name || 'Unknown OS'} / ${deviceInfo.browser?.name || 'Unknown Browser'}`;
}

// --- Routes
app.get('/', (_req, res) => res.send('OK'));

/**
 * Create or return a short URL
 * body: { originalUrl, enableAnalytics?:bool, expiresAt?:ISO, password?:string }
 */
app.post('/shorten', shortenLimiter, async (req, res) => {
  let { originalUrl, enableAnalytics = true, expiresAt, password } = req.body || {};
  if (!originalUrl) return res.status(400).json({ error: 'Missing URL' });

  if (!/^https?:\/\//i.test(originalUrl)) originalUrl = 'http://' + originalUrl;
  if (!validateUrl(originalUrl)) return res.status(400).json({ error: 'Invalid URL' });

  let expiresAtDate = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiresAt date' });
    expiresAtDate = d;
  }

  try {
    // De-dupe only by originalUrl if you prefer single short per URL:
    // let url = await Url.findOne({ originalUrl });
    let url = await Url.findOne({ originalUrl, analyticsEnabled: !!enableAnalytics, expiresAt: expiresAtDate, passwordProtected: !!password });

    if (url) {
      return res.json({ shortUrl: `${process.env.BASE_URL}/${url.shortId}` });
    }

    const shortId = nanoid(5);
    const doc = new Url({
      originalUrl,
      shortId,
      analyticsEnabled: !!enableAnalytics,
      expiresAt: expiresAtDate || null,
      isActive: true,
      passwordProtected: !!password,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
    });

    await doc.save();
    return res.json({ shortUrl: `${process.env.BASE_URL}/${shortId}` });
  } catch (err) {
    console.error('shorten error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * QR code image for a short link
 * GET /:shortId/qr  -> image/png
 */
app.get('/:shortId/qr', async (req, res) => {
  const { shortId } = req.params;
  try {
    const doc = await Url.findOne({ shortId });
    if (!doc) return res.status(404).send('Not found');

    const shortUrl = `${process.env.BASE_URL.replace(/\/+$/, '')}/${doc.shortId}`;
    res.setHeader('Content-Type', 'image/png');
    await QRCode.toFileStream(res, shortUrl, { margin: 1, width: 300 });
  } catch (err) {
    console.error('qr error:', err);
    res.status(500).send('Server error');
  }
});

/**
 * Password gate (HTML form) if a link is protected.
 * If not protected, this route will redirect immediately (and record analytics).
 */
app.get('/:shortId', redirectLimiter, async (req, res) => {
  const { shortId } = req.params;

  try {
    const url = await Url.findOne({ shortId }).select('+passwordHash');

    if (!url) return res.status(404).send('URL not found');
    if (!url.isActive) return res.status(410).send('This short link is inactive');
    if (url.expiresAt && url.expiresAt.getTime() <= Date.now()) return res.status(410).send('This short link has expired');

    // If password protected, show a tiny HTML form
    if (url.passwordProtected) {
      const html = `
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Protected Link</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",sans-serif;background:#0b0b0b;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#151515;padding:24px 22px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);width:min(92vw,420px)}
  h1{font-size:20px;margin:0 0 14px}
  label{font-size:14px;opacity:.9}
  input{width:100%;margin:10px 0 16px;padding:10px 12px;border-radius:8px;border:1px solid #333;background:#0f0f0f;color:#fff}
  button{width:100%;padding:10px 12px;border:0;border-radius:8px;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer}
  p.err{color:#f87171;font-size:13px}
</style>
</head><body>
  <form class="card" method="POST" action="/${shortId}/unlock">
    <h1>Enter password to continue</h1>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" required />
    <button type="submit">Unlock & Redirect</button>
  </form>
</body></html>`;
      return res.status(200).send(html);
    }

    // Not protected: record analytics & redirect
    await recordAnalytics(url, req);
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error('redirect error:', err);
    return res.status(500).send('Server error');
  }
});

/**
 * Verify password then redirect; also records analytics.
 */
app.post('/:shortId/unlock', redirectLimiter, async (req, res) => {
  const { shortId } = req.params;
  const { password } = req.body || {};

  try {
    const url = await Url.findOne({ shortId }).select('+passwordHash');
    if (!url) return res.status(404).send('URL not found');
    if (!url.passwordProtected) return res.redirect(`/${shortId}`); // no password needed
    if (!password || !url.passwordHash || !(await bcrypt.compare(password, url.passwordHash))) {
      return res.status(401).send('Invalid password');
    }

    await recordAnalytics(url, req);
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error('unlock error:', err);
    return res.status(500).send('Server error');
  }
});

/**
 * Analytics query (same as before)
 * body: { url }
 */
app.post('/analytics/query', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Provide url' });

  try {
    let doc = null;
    const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
    const maybeId = url.replace(base, '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    if (/^[A-Za-z0-9_-]{4,15}$/.test(maybeId)) doc = await Url.findOne({ shortId: maybeId });
    if (!doc) doc = await Url.findOne({ originalUrl: url });
    if (!doc) return res.status(404).json({ error: 'No analytics found for this URL' });

    return res.json({
      shortUrl: `${base}/${doc.shortId}`,
      clickCount: doc.clickCount || 0,
      events: (doc.events || []).map(e => ({
        time: e.time, referrer: e.referrer || '', ip: e.ip || '',
        country: e.country || '', city: e.city || '', userAgent: e.userAgent || '',
      })),
    });
  } catch (err) {
    console.error('analytics query error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Shared analytics updater
async function recordAnalytics(urlDoc, req) {
  const updates = { $inc: { clickCount: 1 } };
  if (urlDoc.analyticsEnabled) {
    const ip = getClientIp(req);
    const event = {
      time: new Date(),
      ip,
      referrer: req.get('referer') || '',
      userAgent: simplifyUA(req.get('user-agent')),
      country: req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || '',
      city: req.get('x-vercel-ip-city') || '',
    };
    updates.$push = { events: event };
  }
  await Url.updateOne({ _id: urlDoc._id }, updates);
}

// --- Start
app.listen(port, () => {
  console.log(`Server running at ${process.env.BASE_URL}`);
});
