import express from 'express';
import { nanoid } from 'nanoid';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './Connection/DB.js';
import Url from './Schemas/MongoDB.js';
import { validateUrl } from './utils/validateUrl.js';
import {UAParser} from 'ua-parser-js';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 8080;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Utility: get client IP (works behind proxies that set X-Forwarded-For).
 *  If you’re on Render/Vercel/Nginx, make sure to trust proxy if needed:
 *  app.set('trust proxy', true);
 */
app.set('trust proxy', true);
function getClientIp(req) {
    const xfwd = req.headers['x-forwarded-for'];
    if (typeof xfwd === 'string') {
        // x-forwarded-for may contain a list: "client, proxy1, proxy2"
        return xfwd.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '';
}

async function geoLookup(ip) {
    // ignore localhost/loopback
    if (!ip || ip === '::1' || ip.startsWith('127.')) return { country: '', city: '' };
    try {
        const r = await fetch(`https://ipapi.co/${ip}/json/`, { timeout: 1500 });
        const j = await r.json();
        return { country: j.country_name || '', city: j.city || '' };
    } catch {
        return { country: '', city: '' };
    }
}


app.get('/', (_req, res) => {
    res.send('OK');
});

/**
 * Create/return a short URL
 * Expects body:
 *  - originalUrl: string (required)
 *  - enableAnalytics: boolean (optional, default true)
 *  - expiresAt: ISO string (optional) — exact deletion time for this short link
 */
app.post('/shorten', async (req, res) => {
    let { originalUrl, enableAnalytics = true, expiresAt } = req.body || {};

    if (!originalUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    // Ensure scheme
    if (!/^https?:\/\//i.test(originalUrl)) {
        originalUrl = 'http://' + originalUrl;
    }

    if (!validateUrl(originalUrl)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    // Normalize expiresAt -> Date or null
    let expiresAtDate = null;
    if (expiresAt) {
        const d = new Date(expiresAt);
        if (isNaN(d.getTime())) {
            return res.status(400).json({ error: 'Invalid expiresAt date' });
        }
        expiresAtDate = d;
    }

    try {
        // Reuse existing short link if same original URL and same options (optional choice).
        // If you want "one URL => one shortId" regardless of options, drop the additional fields from this query.
        let url = await Url.findOne({ originalUrl, analyticsEnabled: !!enableAnalytics, expiresAt: expiresAtDate });

        if (url) {
            return res.json({ shortUrl: `${process.env.BASE_URL}/${url.shortId}` });
        }

        // create a new short link
        const shortId = nanoid(5);
        url = new Url({
            originalUrl,
            shortId,
            analyticsEnabled: !!enableAnalytics,
            expiresAt: expiresAtDate || null,
            isActive: true,
            clickCount: 0,
            events: [],
        });

        await url.save();
        return res.json({ shortUrl: `${process.env.BASE_URL}/${shortId}` });
    } catch (error) {
        console.error('Error saving to database:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Redirect endpoint
 * - Increments clickCount
 * - Optionally records analytics event
 */
app.get('/:shortId', async (req, res) => {
    const { shortId } = req.params;
    try {
        const url = await Url.findOne({ shortId });

        if (!url) {
            return res.status(404).send('URL not found');
        }

        if (!url.isActive) {
            return res.status(410).send('This short link is inactive');
        }

        // If expired (Mongo TTL might not have deleted it yet), block redirect
        if (url.expiresAt && url.expiresAt.getTime() <= Date.now()) {
            return res.status(410).send('This short link has expired');
        }

        // Update analytics
        const updates = { $inc: { clickCount: 1 } };

        if (url.analyticsEnabled) {
            const ip = getClientIp(req);
            const ua = new UAParser(req.get('user-agent') || '').getResult();
            const { country, city } = await geoLookup(ip);

            const event = {
                time: new Date(),
                ip,
                referrer: req.get('referer') || '',
                userAgent: `${ua.os.name || 'Unknown OS'} / ${ua.browser.name || 'Unknown Browser'}`,
                country,
                city,
            };
            updates.$push = { events: event };
        }

        await Url.updateOne({ _id: url._id }, updates);
        return res.redirect(url.originalUrl);
    } catch (error) {
        console.error('Error retrieving from database:', error);
        return res.status(500).send('Server error');
    }
});

/**
 * Analytics query
 * POST /analytics/query
 * Body: { url: "<original or short>" }
 * Returns: { shortUrl, clickCount, events: [...] }
 */
app.post('/analytics/query', async (req, res) => {
    // console.log('Analytics query received:', req.body);
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Provide url' });

    try {
        let doc = null;

        // Try matching a shortId if it's a short URL
        // Accept both full short URL and just the id
        const base = process.env.BASE_URL?.replace(/\/+$/, '') || '';
        const maybeId =
            url.replace(base, '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');

        if (/^[A-Za-z0-9_-]{4,15}$/.test(maybeId)) {
            doc = await Url.findOne({ shortId: maybeId });
        }

        // Otherwise try match by originalUrl
        if (!doc) {
            doc = await Url.findOne({ originalUrl: url });
        }

        if (!doc) return res.status(404).json({ error: 'No analytics found for this URL' });

        return res.json({
            shortUrl: `${base}/${doc.shortId}`,
            clickCount: doc.clickCount || 0,
            events: (doc.events || []).map(e => ({
                time: e.time,
                referrer: e.referrer || '',
                ip: e.ip || '',
                country: e.country || '',
                city: e.city || '',
                userAgent: e.userAgent || '',
            })),
        });
    } catch (err) {
        console.error('Analytics query error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at ${process.env.BASE_URL}`);
});
