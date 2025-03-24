const https = require('https');
const fs = require('fs');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8443;

const CLOUDFLARE_SECRET_KEY = '0x4AAAAAABBwUnoKsAA8bZl3OCBtR7iYLew';

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/expo.benfink.nyc/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/expo.benfink.nyc/fullchain.pem')
};

app.use(cors({
    origin: 'https://expo.benfink.nyc',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'CF-Connecting-IP'],
}));
app.use(bodyParser.json());

app.post('/turnstile-verification', async (req, res) => {
    try {
        const body = await req.formData();
        const token = body.get('cf-turnstile-response');
        const ip = req.headers.get('CF-Connecting-IP');
        let formData = new FormData();
        formData.append('secret', CLOUDFLARE_SECRET_KEY);
        formData.append('response', token);
        formData.append('remoteip', ip);

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteveify', {
            body: formData,
            method: 'POST',
        });

        const outcome = await result.json();

        if (outcome.success) {
            return res.json({success: true, message: 'Verification successful!'});
        } else {
            return res.status(400).json({success: false, message: 'Verification failed. Invalid token.'})
        }
    } catch (err) {
        console.error('Turnstile error. ', err);
        return res.status(500).json({success: false, message: 'Server error.', error: err});
    }
});

https.createServer(options, app).listen(PORT, () => {
    console.log(`File "server.js" listening on port ${PORT}.`)
});