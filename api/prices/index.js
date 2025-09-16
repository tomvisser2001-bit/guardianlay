// Edge runtime + Stripe REST API (geen node modules nodig)
export const config = { runtime: 'edge' };

const J = (d, s=200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

async function stripeGet(path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'stripe_error');
  return data;
}

export default async function handler(req) {
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);
  try {
    // haal beide prijzen op en include meteen het gekoppelde product
    const ids = [process.env.PRICE_FIX, process.env.PRICE_PRO];
    const [fix, pro] = await Promise.all(
      ids.map(id => stripeGet(`prices/${id}?expand[]=product`))
    );

    const map = (p) => ({
      id: p.id,                           // price id
      product_id: p.product?.id,
      name: p.product?.name,
      description: p.product?.description,
      img: p.product?.images?.[0] || null,
      currency: p.currency,
      amount: (p.unit_amount || 0) / 100,
      interval: p.recurring?.interval || 'one_time',
      metadata: p.product?.metadata || {}
    });

    return J({
      plans: [
        { key: 'fix', ...map(fix) },
        { key: 'pro', ...map(pro) }
      ]
    });
  } catch (e) {
    return J({ error: e.message }, 500);
  }
}
