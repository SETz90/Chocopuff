/**
 * server.js — Chocopuff SMS order-tracking backend
 *
 * Flow:
 * 1. Frontend POSTs to /api/orders the moment "Place Order" is clicked OR
 * when phone number validation passes during secure checkout.
 * 2. We immediately text the phone number from the checkout form:
 * "your order is preparing".
 * 3. After OUT_FOR_DELIVERY_DELAY_MS (default 60000 = 1 minute), we
 * text the same number again: "your order is out for delivery".
 * */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sendSMS } = require('./sms');

const app = express();

const PORT             = process.env.PORT || 4000;
const DELAY_MS          = parseInt(process.env.OUT_FOR_DELIVERY_DELAY_MS || '60000', 10);

// Use the explicit Netlify URL as the origin, fall back to ALLOWED_ORIGIN if needed
const corsOptions = {
    origin: 'https://chocopuff.netlify.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// orderId -> order record stored safely in-memory
const orders = new Map();

function generateOrderId() {
    const stamp  = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CP${stamp}${random}`;
}

function firstNameOf(fullName) {
    const trimmed = String(fullName || '').trim();
    return trimmed.split(/\s+/)[0] || 'there';
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, ordersTracked: orders.size });
});

app.post('/api/orders', async (req, res) => {
    const { name, phone, address, city, zip, paymentMethod, items, total } = req.body || {};

    if (!name || !phone || !address) {
        return res.status(400).json({ error: 'Missing required fields: name, phone, address.' });
    }

    // Server-side regex backstop to ensure number matches local structure
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!/^0\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({
            error: 'Phone number must be an 11-digit PH mobile number, e.g. 09171234567.'
        });
    }

    const orderId  = generateOrderId();
    const firstName = firstNameOf(name);

    const order = {
        id: orderId,
        name,
        phone: cleanPhone,
        address,
        city,
        zip,
        paymentMethod,
        items: Array.isArray(items) ? items : [],
        total: typeof total === 'number' ? total : null,
        status: 'preparing',
        createdAt: new Date().toISOString()
    };
    orders.set(orderId, order);

    // --- SMS #1: order is preparing (sent right away) ---
    let smsWarning = null;
    try {
        // FIXED: Added 'items' as the third parameter here
        await sendSMS(
            cleanPhone,
            `Hi ${firstName}! Your Chocopuff order #${orderId} is confirmed and now PREPARING. ` +
            `We'll text you again once it's out for delivery.`,
            items
        );
    } catch (err) {
        console.error(`[order ${orderId}] "preparing" SMS failed:`, err.message);
        smsWarning = 'Order placed, but the confirmation SMS could not be sent. Check the backend logs.';
    }

    // --- SMS #2: out for delivery (sent after the delay) ---
    setTimeout(async () => {
        const current = orders.get(orderId);
        if (!current) return; // If order record was cleared/purged, do nothing

        current.status = 'out_for_delivery';
        try {
            // FIXED: Added 'items' as the third parameter here
            await sendSMS(
                cleanPhone,
                `Good news ${firstName}! Your Chocopuff order #${orderId} is now OUT FOR DELIVERY ` +
                `and should arrive soon.`,
                items
            );
        } catch (err) {
            console.error(`[order ${orderId}] "out for delivery" SMS failed:`, err.message);
        }
    }, DELAY_MS);

    res.status(201).json({ orderId, status: order.status, warning: smsWarning });
});

// Endpoint tracking utility route for checkouts or tracker statuses
app.get('/api/orders/:id', (req, res) => {
    const order = orders.get(req.params.id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
    }
    res.json(order);
});

app.listen(PORT, () => {
    console.log(`Chocopuff SMS backend running on port ${PORT}`);
    console.log(`"Out for delivery" follow-up text fires ${DELAY_MS}ms after each order.`);
});