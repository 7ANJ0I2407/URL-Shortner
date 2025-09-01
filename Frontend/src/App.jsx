import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import { TextField, FormControlLabel, Switch, Stack, Tooltip } from '@mui/material';
import Card from '@mui/material/Card';

function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [enableAnalytics, setEnableAnalytics] = useState(true);

  // NEW: password toggle + value
  const [protectWithPassword, setProtectWithPassword] = useState(false);
  const [password, setPassword] = useState('');

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!originalUrl) {
      setAlertMessage('URL cannot be empty.');
      return;
    }
    if (!/^https:\/\//i.test(originalUrl)) {
      setAlertMessage('URL must start with "https"');
      return;
    }
    if (protectWithPassword && !password) {
      setAlertMessage('Please enter a password or turn off password protection.');
      return;
    }

    setAlertMessage('First time? The server may take a few seconds to wake up.');

    try {
      const payload = {
        originalUrl,
        enableAnalytics,
        ...(expiresAt ? { expiresAt: new Date(expiresAt + 'T23:59:59.999Z').toISOString() } : {}),
        ...(protectWithPassword && password ? { password } : {}),
      };

      const { data } = await axios.post(`${apiBase}/shorten`, payload);
      setShortUrl(data.shortUrl);
      setAlertMessage('');
    } catch (error) {
      console.error('Error creating short URL:', error);
      setAlertMessage('Failed to shorten the URL. Please try again.');
    }
  }, [originalUrl, expiresAt, enableAnalytics, protectWithPassword, password, apiBase]);

  const shortId = shortUrl ? shortUrl.split('/').pop() : '';

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 200px)", marginTop: "-60px", marginBottom: "-60px" }}>
      <Card style={{ padding: "40px", width: "460px", backgroundColor: "#FEFEFF" }}>
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
              helperText="Auto-expire the short URL on this date."
            />

            <Tooltip title="If ON, we’ll record click analytics for this link. If OFF, no analytics will be stored.">
              <FormControlLabel
                control={<Switch checked={enableAnalytics} onChange={(e) => setEnableAnalytics(e.target.checked)} />}
                label="Enable Analytics for this URL"
              />
            </Tooltip>

            {/* NEW: Password protection */}
            <Tooltip title="Require a password before redirecting to the original URL.">
              <FormControlLabel
                control={<Switch checked={protectWithPassword} onChange={(e) => setProtectWithPassword(e.target.checked)} />}
                label="Password protect this link"
              />
            </Tooltip>

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!protectWithPassword}
              helperText={protectWithPassword ? "Users must enter this password to proceed." : "Turn on password protection to enable."}
            />

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

            {/* QR link */}
            {shortId && apiBase && (
              <div style={{ marginTop: 12 }}>
                <a
                  href={`${apiBase}/${shortId}/qr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get QR (PNG)
                </a>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default App;
