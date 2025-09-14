export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { email, source = 'unknown' } = await req.json();
    if (!email || !email.includes('@')) return json({ ok:false, error:'invalid_email' }, 400);

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    const resp = await fetch(`${url}/rest/v1/waitlist?on_conflict=email`, {
      method:'POST',
      headers:{
        apikey:key,
        Authorization:`Bearer ${key}`,
        'Content-Type':'application/json',
        Prefer:'resolution=ignore-duplicates,return=representation'
      },
      body: JSON.stringify([{ email, source, created_at: new Date().toISOString() }])
    });

    if (resp.status === 409) return json({ ok:true, already:true });
    if (!resp.ok) return json({ ok:false, error:'supabase_insert_failed', detail: await resp.text() }, 500);
    return json({ ok:true });
  } catch (e) {
    return json({ ok:false, error:'server_error', detail:e.message }, 500);
  }
}
function json(data, status=200){ return new Response(JSON.stringify(data), { status, headers:{ 'Content-Type':'application/json' } }); }
