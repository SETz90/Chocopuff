/**
 * server.js — Chocopuff SMS order-tracking backend
 * */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Safe check if sms module exists; fall back to logging if missing
let sendSMS;
try {
    sendSMS = require('./sms').sendSMS;
} catch (e) {
    console.warn("Warning: sms.js module missing or has internal errors. Using fallback logger.");
    sendSMS = async (phone, message) => { console.log(`[SMS Fallback to ${phone}]: ${message}`); };
}

const app = express();
const PORT = process.env.PORT || 10000; // Updated to match your active Render environment port logs
const DELAY_MS = parseInt(process.env.OUT_FOR_DELIVERY_DELAY_MS || '60000', 10);

const corsOptions = {
    origin: 'https://chocopuff.netlify.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-auth'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// In-memory data map initialized clean for new customer entries
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
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const orderId  = generateOrderId();
    const firstName = firstNameOf(name);

    const order = {
        id: orderId, name, phone: cleanPhone, address, city, zip, paymentMethod,
        items: Array.isArray(items) ? items : [],
        total: typeof total === 'number' ? total : null,
        status: 'preparing',
        createdAt: new Date().toISOString()
    };
    orders.set(orderId, order);

    try {
        await sendSMS(cleanPhone, `Hi ${firstName}! Your Chocopuff order #${orderId} is PREPARING.`, items);
    } catch (err) {
        console.error("SMS #1 failed:", err.message);
    }

    setTimeout(async () => {
        const current = orders.get(orderId);
        if (!current) return;
        current.status = 'out_for_delivery';
        try {
            await sendSMS(cleanPhone, `Good news ${firstName}! Order #${orderId} is OUT FOR DELIVERY.`, items);
        } catch (err) {
            console.error("SMS #2 failed:", err.message);
        }
    }, DELAY_MS);

    res.status(201).json({ orderId, status: order.status });
});

app.get('/api/admin/orders', (req, res) => {
    const adminSecret = req.headers['x-admin-auth'];
    if (adminSecret !== 'amadeotristanpetey8080' && adminSecret !== 'JamesHilado') {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    res.json({ ok: true, orders: Array.from(orders.values()) });
});

app.listen(PORT, () => {
    console.log(`Backend running smoothly on port ${PORT}`);
});