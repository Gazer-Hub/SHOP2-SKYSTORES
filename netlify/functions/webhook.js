const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const SIGN_HEADER = (process.env.SIGNATURE_HEADER || 'x-signature').toLowerCase();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const raw = event.body || '';

  // verify signature if secret present
  if (WEBHOOK_SECRET) {
    const sig = (event.headers && (event.headers[SIGN_HEADER] || event.headers[SIGN_HEADER.toLowerCase()])) || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { statusCode: 400, body: 'invalid signature' };
      }
    } catch (e) {
      return { statusCode: 400, body: 'invalid signature' };
    }
  }

  let payload;
  try { payload = JSON.parse(raw); } catch (e) { return { statusCode: 400, body: 'invalid json' }; }

  // Map typical fields — adjust later to match Moniepoint payload
  const paymentId = payload.id || payload.data?.id || payload.transactionId || `evt_${Date.now()}`;
  const amount = payload.amount || payload.data?.amount || payload.transaction?.amount || 0;
  const currency = payload.currency || payload.data?.currency || 'NGN';
  const status = payload.status || payload.data?.status || 'unknown';
  const payer = payload.customer || payload.data?.customer || payload.payer || null;

  const record = {
    id: String(paymentId),
    amount: Number(amount),
    currency,
    status,
    payer,
    raw: payload,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('payments').upsert(record, { onConflict: 'id' });
  if (error) {
    console.error('supabase insert error', error);
    return { statusCode: 500, body: 'db error' };
  }
  return { statusCode: 200, body: 'ok' };
};
