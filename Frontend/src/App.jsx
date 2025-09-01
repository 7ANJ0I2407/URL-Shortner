import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Button, TextField, FormControlLabel, Switch, Stack, Tooltip, Card, Box, Divider
} from '@mui/material';

function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [protectWithPassword, setProtectWithPassword] = useState(false);
  const [password, setPassword] = useState('');

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!originalUrl) return setAlertMessage('URL cannot be empty.');
    if (!/^https:\/\//i.test(originalUrl)) return setAlertMessage('URL must start with "https"');
    if (protectWithPassword && !password) return setAlertMessage('Enter a password or turn off protection.');

    setAlertMessage('First time? Server may take a few seconds to wake up.');

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
    } catch (err) {
      console.error(err);
      setAlertMessage('Failed to shorten the URL. Please try again.');
    }
  }, [originalUrl, expiresAt, enableAnalytics, protectWithPassword, password, apiBase]);

  const shortId = shortUrl ? shortUrl.split('/').pop() : '';

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 160px)', // give room between header/footer
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        py: { xs: 4, md: 8 }, // top/bottom padding
        px: 2,
      }}
    >
      <Card
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 560,
          bgcolor: '#FEFEFF',
          px: { xs: 3, md: 5 },
          py: { xs: 3, md: 4 },
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box component="h1" sx={{ m: 0, fontSize: 34, fontWeight: 700 }}>
            URL Shortener
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.25}>
            <TextField
              fullWidth
              label="Input URL"
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />

            <TextField
              fullWidth
              label="Expiry date (optional)"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Auto-expire the short URL on this date."
            />

            <Divider sx={{ my: 0.5 }} />

            <Tooltip title="If ON, we’ll record click analytics for this link. If OFF, no analytics will be stored.">
              <FormControlLabel
                sx={{ mx: 0 }}
                control={
                  <Switch
                    checked={enableAnalytics}
                    onChange={(e) => setEnableAnalytics(e.target.checked)}
                  />
                }
                label="Enable Analytics for this URL"
              />
            </Tooltip>

            <Tooltip title="Require a password before redirecting to the original URL.">
              <FormControlLabel
                sx={{ mx: 0, mt: -0.5 }}
                control={
                  <Switch
                    checked={protectWithPassword}
                    onChange={(e) => setProtectWithPassword(e.target.checked)}
                  />
                }
                label="Password protect this link"
              />
            </Tooltip>

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!protectWithPassword}
              helperText={
                protectWithPassword
                  ? 'Users must enter this password to proceed.'
                  : 'Turn on password protection to enable.'
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 0.5, py: 1.2 }}
              fullWidth
            >
              SHORTEN
            </Button>
          </Stack>
        </Box>

        {alertMessage && (
          <Box sx={{ textAlign: 'center', mt: 2, color: 'error.main', fontSize: 14 }}>
            {alertMessage}
          </Box>
        )}

        {shortUrl && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Box component="h3" sx={{ m: 0, mb: 1 }}>
              Your Shortened URL:
            </Box>
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>

            {shortId && apiBase && (
              <Box sx={{ mt: 1.5 }}>
                <a
                  href={`${apiBase}/${shortId}/qr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get QR (PNG)
                </a>
              </Box>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}

export default App;
