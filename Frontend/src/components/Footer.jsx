import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const Footer = () => {
    return (
        <Box sx={{ bgcolor: 'background.paper', p: 4 }} component="footer">
            <Typography variant="h6" align="center" gutterBottom>
                URL Shortener
            </Typography>
            <Typography
                variant="subtitle1"
                align="center"
                color="text.secondary"
                component="p"
            >
                Shorten your URLs with ease!
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
                {'Copyright © '}
                <a color="inherit" href="https://github.com/7ANJ0I2407">
                    SANJOY
                </a>{' '}
                {new Date().getFullYear()}
                {'.'}
            </Typography>
        </Box>
    );
}

export default Footer;
