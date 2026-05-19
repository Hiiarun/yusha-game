const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const sessionId = session.client_reference_id;

    if (sessionId) {
      const { data } = await supabase
        .from('coins')
        .select('coins')
        .eq('session_id', sessionId)
        .single();

      if (data) {
        await supabase
          .from('coins')
          .update({ coins: data.coins + 1000 })
          .eq('session_id', sessionId);
      } else {
        await supabase
          .from('coins')
          .insert({ session_id: sessionId, coins: 1000 });
      }
    }
  }

  return { statusCode: 200, body: 'OK' };
};
