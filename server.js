/**
 * sms.js — Chocopuff Tracking Integration (Discord Advanced Receipt Edition)
 * Formats tracking context alongside itemized shopping lists using the native HTTPS module.
 */
const https = require('https');

async function sendSMS(number, message, items = []) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
        throw new Error('Discord Webhook credentials missing from environment variables.');
    }

    const url = new URL(webhookUrl);

    // 1. Loops through the customer's items to generate the detailed menu breakdown
    let itemizedMenuString = "";
    if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
            const productTitle = item.title || item.name || 'Chocopuff Treat';
            const productPrice = item.price ? `₱${parseFloat(item.price).toFixed(2)}` : 'N/A';
            itemizedMenuString += `• 🍫 **${productTitle}** — Qty: \`${item.quantity}\` | Price: ${productPrice}\n`;
        });
    } else {
        itemizedMenuString = "_No direct item parameters attached to this checkout context packet._";
    }

    // 2. Build a highly visible Discord Embed configuration structure
    const payload = JSON.stringify({
        embeds: [{
            title: "🛍️ New Storefront Order Registered!",
            color: 16757760, // Elegant golden amber color accent
            fields: [
                {
                    name: "📱 Customer Contact",
                    value: `\`${number}\``,
                    inline: true
                },
                {
                    name: "📢 Live Tracking Alert Status",
                    value: message,
                    inline: false
                },
                {
                    name: "📋 Ordered Menu Breakdown",
                    value: itemizedMenuString,
                    inline: false
                }
            ],
            footer: {
                text: "Chocopuff Order Despatch Automated System"
            },
            timestamp: new Date().toISOString()
        }]
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
                    console.log(`[Discord API] Successfully submitted detailed menu payload to server channel.`);
                    resolve(body);
                } else {
                    reject(new Error(`Discord API responded with status code ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

module.exports = { sendSMS };