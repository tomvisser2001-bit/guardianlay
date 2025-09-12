export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const { email, source = 'unknown' } = await req.json();
    if (!email || !email.includes('@')) {
      return json({ ok: false, error: 'invalid_email' }, 400);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return json({ ok:false, error:'missing_env' }, 500);

    const r = await fetch(`${url}/rest/v1/waitlist`, {
      method:'POST',
      headers:{
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([{ email, source, created_at: new Date().toISOString() }])
    });

    if (!r.ok) return json({ ok:false, error:'supabase_insert_failed', detail: await r.text() }, 500);
    return json({ ok:true });
  } catch (e) {
    return json({ ok:false, error:'bad_request', detail: e.message }, 400);
  }
}
function json(obj, status=200) {
  return new Response(JSON.stringify(obj), { status, headers:{'Content-Type':'application/json'} });
}
