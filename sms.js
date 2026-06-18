/**
 * sms.js — Chocopuff Tracking Integration (Discord Webhook Edition)
 * Bypasses international SMS blocks completely, delivering free, instant tracking updates.
 */
const https = require('https');

async function sendSMS(number, message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
        throw new Error('Discord Webhook credentials missing from environment variables.');
    }

    // Parse the full webhook URL into parts that the native https module can read
    const url = new URL(webhookUrl);

    // Format the alert text beautifully using Discord Markdown formatting
    const payload = JSON.stringify({
        content: `🔔 **Chocopuff Order Update**\n📱 *Recipient:* \`${number}\`\n💬 *Message:* ${message}`
    });

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Webhook] Tracking alert successfully routed to Discord.`);
                    resolve(body);
                } else {
                    reject(new Error(`Discord API error (HTTP ${res.statusCode}): ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

module.exports = { sendSMS };