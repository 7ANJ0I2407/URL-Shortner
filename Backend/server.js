import express from "express";
import { nanoid } from 'nanoid';
import cors from 'cors';
import { json } from 'express';

const app = express();
const port = 8080; // Changed port to a safe one

// In-memory storage
const urlDatabase = {};

app.use(cors());
app.use(json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/shorten', (req, res) => {
    let { originalUrl } = req.body;
    if(!originalUrl) {
        return res.status(400).send('Missing URL');
    }
    // Ensure the URL has a valid scheme
    if (!/^https?:\/\//i.test(originalUrl)) {
        originalUrl = 'http://' + originalUrl;
    }

    const shortId = nanoid(5);
    urlDatabase[shortId] = originalUrl;
    res.json({ shortUrl: `http://localhost:${port}/${shortId}` });
});

app.get('/:shortId', (req, res) => {
    const { shortId } = req.params;
    const originalUrl = urlDatabase[shortId];
    if (originalUrl) {
        res.redirect(originalUrl);
    } else {
        res.status(404).send('URL not found');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
