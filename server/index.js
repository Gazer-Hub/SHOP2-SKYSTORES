const express = require('express');
const crypto = require('crypto');
const db = require('./db');

const app = express();

const SIGN_HEADER = (process.env.SIGNATURE_HEADER || 'x-signature').toLowerCase();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const PORT = process.env.PORT || 3000;

// Webhook: use raw body so we can verify signature
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // signature verification only if WEBHOOK_SECRET is set
    if (WEBHOOK_SECRET) {
      const sig = (req.headers[SIGN_HEADER] || '').toString();
      const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex');
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(400).send('invalid signature');
      }
    }

    const evt = JSON.parse(req.body.toString());
    // Map payload fields — adjust the fields according to Moniepoint's actual webhook shape
    const paymentId = evt.id || (evt.data && evt.data.id) || evt.transactionId || `evt_${Date.now()}`;
    const amount = evt.amount || (evt.data && evt.data.amount) || (evt.transaction && evt.transaction.amount) || 0;
    const currency = evt.currency || (evt.data && evt.data.currency) || 'NGN';
    const status = evt.status || (evt.data && evt.data.status) || 'unknown';
    const customer = evt.customer || (evt.data && evt.data.customer) || evt.payer || {};

    const record = {
      id: String(paymentId),
      amount: Number(amount),
      currency: String(currency),
      status: String(status),
      payer: JSON.stringify(customer),
      raw: JSON.stringify(evt),
      created_at: new Date().toISOString()
    };

    await db.insertPayment(record);
    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).send('error');
  }
});

// API to list payments (frontend will call this)
app.get('/api/payments', express.json(), async (req, res) => {
  try {
    const limit = Math.min(500, parseInt(req.query.limit || '100', 10));
    const rows = await db.listPayments(limit);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// Serve the admin UI
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
