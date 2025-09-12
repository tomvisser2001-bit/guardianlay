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

    const resp = await fetch(`${url}/rest/v1/waitlist?on_conflict=email`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    // negeer duplicaten + geef representatie terug
    Prefer: 'resolution=ignore-duplicates,return=representation'
  },
  body: JSON.stringify([{ email, source, created_at: new Date().toISOString() }])
});

// nettere feedback
if (resp.status === 409) return json({ ok: true, already: true }); // conflict (zonder above header)
if (!resp.ok) return json({ ok:false, error:'supabase_insert_failed', detail: await resp.text() }, 500);

return json({ ok: true });

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
