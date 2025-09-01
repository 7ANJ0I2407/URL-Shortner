import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const onAnalytics = location.pathname === '/analytics';
  const showBack = onAnalytics; // show back on analytics page

  return (
    <AppBar position="static">
      <Toolbar sx={{ position: 'relative', minHeight: 72 }}>
        {showBack ? (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        ) : (
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ visibility: 'hidden' }}>
            {/* placeholder to keep title centered */}
            <ArrowBackIcon />
          </IconButton>
        )}

        <Typography variant="h4" component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
          URL Shortener
        </Typography>

        {!onAnalytics && (
          <Button
            color="inherit"
            onClick={() => navigate('/analytics')}
            sx={{ position: 'absolute', right: 16 }}
          >
            Analytics
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
