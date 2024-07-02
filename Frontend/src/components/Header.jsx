import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

const Header = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="menu" style={{height:"100px"}}>
                </IconButton>
                <Typography variant="h4" component="div" sx={{ flexGrow: 1 }} style={{textAlign:"center"}}>
                    URL Shortener
                </Typography>
            </Toolbar>
        </AppBar>
    );
}

export default Header;
