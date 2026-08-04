const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  const limit = Math.min(500, Number((event.queryStringParameters && event.queryStringParameters.limit) || 200));
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, currency, status, payer, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('supabase read error', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'db error' }) };
  }
  return { statusCode: 200, body: JSON.stringify(data) };
};
