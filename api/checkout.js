 import Stripe from 'stripe';

 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

 export default async function handler(req, res) {
   if (req.method !== 'POST') {
     return res.status(405).json({ error: 'Method not allowed' });
   }

   try {
     const { priceId } = req.body;
+    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

+    // PRO is abonnement → subscription mode, QuickFix is eenmalig → payment mode
+    const isSubscription = priceId === process.env.PRICE_PRO;

     const session = await stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
-      mode: priceId === 'price_subscription' ? 'subscription' : 'payment',
-      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success.html`,
-      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel.html`,
+      mode: isSubscription ? 'subscription' : 'payment',
+      success_url: `${process.env.BASE_URL}/success.html`,
+      cancel_url: `${process.env.BASE_URL}/cancel.html`,
     });

     return res.status(200).json({ url: session.url });
   } catch (err) {
     return res.status(500).json({ error: err.message });
   }
 }
