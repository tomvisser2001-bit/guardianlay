export const config = { runtime: 'edge' };

function json(data, status=200){
  return new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json'} });
}

export default async function handler(req){
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try{
    const { mode } = await req.json();
    const price = mode === 'pro' ? process.env.PRICE_PRO : process.env.PRICE_FIX;
    const isSub = mode === 'pro';

    if (!price || !process.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Missing Stripe env vars' }, 500);
    }

    const params = new URLSearchParams();
    params.append('mode', isSub ? 'subscription' : 'payment');
    params.append('success_url', 'https://guardianlay.com/pricing.html?success=1');
    params.append('cancel_url', 'https://guardianlay.com/pricing.html?canceled=1');
    params.append('line_items[0][price]', price);
    params.append('line_items[0][quantity]', '1');
    params.append('allow_promotion_codes', 'true');

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await r.json();
    if (!r.ok) return json({ error: data.error?.message || 'stripe_error' }, 500);

    return json({ url: data.url });
  }catch(e){
    return json({ error: e.message }, 500);
  }
}
