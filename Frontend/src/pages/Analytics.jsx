import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Card, TextField, Button, Stack, Typography, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
const api = import.meta.env.VITE_API_URL;



const Analytics = () => {
  const [queryUrl, setQueryUrl] = useState('');
  const [result, setResult] = useState(null);  // { shortUrl, clickCount, events: [...] }
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    if (!queryUrl) {
      setErrorMsg('Please enter a URL.');
      return;
    }

    try {
      setLoading(true);
      // Backend can accept either original or short URL and resolve analytics.
      // Adjust endpoint/shape later when you share the backend; this is just the wire-up.
      const { data } = await axios.post(`${api}/analytics/query`, { url: queryUrl });
      // expected: { shortUrl, clickCount, events: [{ time, ip, referrer, userAgent, country, city }] }
      setResult(data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [queryUrl]);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 200px)", marginTop: 24 }}>
      <Card style={{ padding: 24, width: '92%', maxWidth: 1100 }}>
        <Typography variant="h5" align="center" gutterBottom>
          URL Analytics
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Enter original or shortened URL"
              value={queryUrl}
              onChange={(e) => setQueryUrl(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Loading...' : 'Fetch'}
            </Button>
          </Stack>
        </form>

        {errorMsg && (
          <Typography color="error" align="center" sx={{ mt: 1 }}>
            {errorMsg}
          </Typography>
        )}

        {result && (
          <>
            <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle2">Short URL</Typography>
                <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
                  <a href={result.shortUrl} target="_blank" rel="noreferrer">{result.shortUrl}</a>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Total Clicks</Typography>
                <Chip label={result.clickCount ?? 0} sx={{ fontSize: 18, height: 36 }} />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Click Details
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Referrer</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>User Agent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(result.events || []).map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{e.time}</TableCell>
                      <TableCell style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.referrer || '-'}</TableCell>
                      <TableCell>{e.ip}</TableCell>
                      <TableCell>{e.country || '-'}</TableCell>
                      <TableCell>{e.city || '-'}</TableCell>
                      <TableCell style={{ maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.userAgent}</TableCell>
                    </TableRow>
                  ))}
                  {(!result.events || result.events.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No click events yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Card>
    </div>
  );
};

export default Analytics;
