import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import { TextField, FormControlLabel, Switch, Stack, Tooltip } from '@mui/material';
import Card from '@mui/material/Card';
const api = import.meta.env.VITE_API_URL;

function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');          // ISO date (yyyy-mm-dd)
  const [enableAnalytics, setEnableAnalytics] = useState(true);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!originalUrl) {
      setAlertMessage('URL cannot be empty.');
      return;
    } else if (!/^https:\/\//i.test(originalUrl)) {
      setAlertMessage('URL must start with "https"');
      return;
    } else {
      setAlertMessage("First time? Please wait a moment while the server wakes up.");
    }

    try {
      const payload = {
        originalUrl,
        enableAnalytics,
        // send ISO timestamp at end of chosen day if provided
        ...(expiresAt ? { expiresAt: new Date(expiresAt + 'T23:59:59.999Z').toISOString() } : {})
      };

      const response = await axios.post(
        `${api}/shorten`,
        payload
      );

      setShortUrl(response.data.shortUrl);
      setAlertMessage('');
    } catch (error) {
      console.error('Error creating short URL:', error);
      setAlertMessage('Failed to shorten the URL. Please try again.');
    }
  }, [originalUrl, expiresAt, enableAnalytics]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 200px)", marginTop: "-60px", marginBottom: "-60px" }}>
      <Card style={{ padding: "40px", width: "440px", backgroundColor: "#FEFEFF" }}>
        <h1 style={{ textAlign: "center", marginTop: 0 }}>URL Shortener</h1>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Input URL"
              variant="outlined"
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />

            <TextField
              label="Expiry date (optional)"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Choose a date to auto-expire the short URL (leave empty for no expiry)."
            />

            <Tooltip title="If ON, we’ll record click analytics for this link. If OFF, we’ll skip storing analytics.">
              <FormControlLabel
                control={
                  <Switch
                    checked={enableAnalytics}
                    onChange={(e) => setEnableAnalytics(e.target.checked)}
                  />
                }
                label="Enable Analytics for this URL"
              />
            </Tooltip>

            <Button variant="contained" type="submit">Shorten</Button>
          </Stack>
        </form>

        {alertMessage && (
          <div className="alert alert-danger" role="alert" style={{ textAlign: 'center', marginTop: 16 }}>
            {alertMessage}
          </div>
        )}

        {shortUrl && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Your Shortened URL:</h3>
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
          </div>
        )}
      </Card>
    </div>
  );
}

export default App;
