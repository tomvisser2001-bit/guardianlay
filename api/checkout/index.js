export const config = { runtime: 'edge' };

const J = (d, s=200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);
  try {
    const { mode } = await req.json(); // 'fix' of 'pro'
    const price = mode === 'pro' ? process.env.PRICE_PRO : process.env.PRICE_FIX;
    const isSub = mode === 'pro';

    if (!price || !process.env.STRIPE_SECRET_KEY) {
      return J({ error: 'Missing Stripe env vars' }, 500);
    }

    const params = new URLSearchParams();
    params.append('mode', isSub ? 'subscription' : 'payment');
    params.append('success_url', `${process.env.BASE_URL}/success.html`);
    params.append('cancel_url', `${process.env.BASE_URL}/cancel.html`);
    params.append('line_items[0][price]', price);
    params.append('line_items[0][quantity]', '1');
    params.append('allow_promotion_codes', 'true');

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await r.json();
    if (!r.ok) return J({ error: data.error?.message || 'stripe_error' }, 500);

    return J({ url: data.url });
  } catch (e) {
    return J({ error: e.message }, 500);
  }
}
