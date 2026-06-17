/**
 * sms.js — Chocopuff SMS Integration (Infobip REST version)
 */
const https = require('https'); // Use native HTTPS module so it never breaks on older Node versions

async function sendSMS(number, message) {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL;
    if (!apiKey || !baseUrl) {
        throw new Error('SMS Credentials missing from .env file.');
    }

    // Convert local PH numbers format (09XXXXXXXXX) to global standard (639XXXXXXXXX)
    let formattedNumber = String(number).trim();
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '63' + formattedNumber.slice(1);
    }

    const payload = JSON.stringify({
        messages: [{
            destinations: [{ to: formattedNumber }],
            from: "Chocopuff",
            text: message
        }]
    });

    const options = {
        hostname: baseUrl,
        path: '/sms/2/text/advanced',
        method: 'POST',
        headers: {
            'Authorization': `App ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Infobip API error (HTTP ${res.statusCode}): ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

module.exports = { sendSMS };