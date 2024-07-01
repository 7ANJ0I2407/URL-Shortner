import React, { useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import { TextField } from '@mui/material';
import Card from '@mui/material/Card';

function App() {
    const [originalUrl, setOriginalUrl] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Check if the URL is empty or does not start with 'https'
        if (!originalUrl) {
            setAlertMessage('URL cannot be empty.');
            return;
        } else if (!originalUrl.startsWith('https')) {
            setAlertMessage('URL must start with "https".');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8080/shorten', { originalUrl });
            setShortUrl(response.data.shortUrl);
            setAlertMessage('');  // Clear any previous alert messages
        } catch (error) {
            console.error('Error creating short URL:', error);
            setAlertMessage('Failed to shorten the URL. Please try again.');
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", marginTop: "-20px" }}>
            <Card style={{ padding: "40px", width: "400px", backgroundColor:"#FEFEFF"}}>
                <h1 style={{ textAlign: "center" }}>URL Shortener</h1>
                
                <div>
                    <form onSubmit={handleSubmit} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <TextField
                            style={{ margin: "15px 28px 15px 10px" }}
                            id="outlined-basic"
                            label="Input URL"
                            variant="outlined"
                            type="text"
                            value={originalUrl}
                            onChange={(e) => setOriginalUrl(e.target.value)}
                        />
                        <Button variant="contained" type="submit">Shorten</Button>
                    </form>
                </div>
                {alertMessage && (
                    <div className="alert alert-danger" role="alert" style={{ textAlign: 'center' }}>
                        {alertMessage}
                    </div>
                )}
                {shortUrl && (
                    <div style={{ textAlign: 'center' }}>
                        <h3 >Your Shortened URL:</h3>
                        <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default App;
