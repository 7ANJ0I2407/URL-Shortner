import express from 'express';
import { nanoid } from 'nanoid';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './Connection/DB.js';
import Url from './Schemas/MongoDB.js';
import { validateUrl } from './utils/validateUrl.js'; 

const app = express();
const port = process.env.PORT || 8080;
const baseUrl = `http://localhost:${port}`;  // Set base URL directly

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send('Hello World');
    // console.log(req.protocol + '://' + req.get('host') + req.originalUrl);
});

app.post('/shorten', async (req, res) => {
    let { originalUrl } = req.body;
    if (!originalUrl) {
        return res.status(400).send('Missing URL');
    }

    // Ensure the URL has a valid scheme
    if (!/^https?:\/\//i.test(originalUrl)) {
        originalUrl = 'http://' + originalUrl;
    }

    // Validate URL (optional)
    if (!validateUrl(originalUrl)) {
        return res.status(400).send('Invalid URL');
    }

    try {
        // Check if already exists
        let url = await Url.findOne({ originalUrl });
        if (url) {
            return res.json({ shortUrl: `${baseUrl}/${url.shortId}` });
        }

        // If not, create a new
        const shortId = nanoid(5);
        url = new Url({
            originalUrl,
            shortId
        });
        await url.save();
        res.json({ shortUrl: `${baseUrl}/${shortId}` });
    } catch (error) {
        console.error('Error saving to database:', error);
        res.status(500).send('Server error');
    }
});

app.get('/:shortId', async (req, res) => {
    const { shortId } = req.params;
    try {
        const url = await Url.findOne({ shortId });
        if (url) {
            res.redirect(url.originalUrl);
        } else {
            res.status(404).send('URL not found');
        }
    } catch (error) {
        console.error('Error retrieving from database:', error);
        res.status(500).send('Server error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at ${baseUrl}`);
});
