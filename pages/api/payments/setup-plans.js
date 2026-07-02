// pages/api/payments/setup-plans.js
// ONE-TIME SETUP: Visit /api/payments/setup-plans?secret=SETUP_SECRET to create all Razorpay plans
// After running, add the returned plan IDs as env vars in Vercel

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-setup-secret'];
  if (secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Pass ?secret=YOUR_SETUP_SECRET' });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in Vercel env vars first' });
  }

  const auth = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

  const plans = [
    { key:'IND_STARTER_M',  name:'Blitora Pulse Individual Starter - Monthly',      period:'monthly', interval:1, amount:9900   },
    { key:'IND_PLUS_M',     name:'Blitora Pulse Individual Plus - Monthly',          period:'monthly', interval:1, amount:18900  },
    { key:'IND_PREMIUM_M',  name:'Blitora Pulse Individual Premium - Monthly',       period:'monthly', interval:1, amount:44900  },
    { key:'IND_STARTER_A',  name:'Blitora Pulse Individual Starter - Annual',        period:'yearly',  interval:1, amount:97200  },
    { key:'IND_PLUS_A',     name:'Blitora Pulse Individual Plus - Annual',           period:'yearly',  interval:1, amount:186000 },
    { key:'IND_PREMIUM_A',  name:'Blitora Pulse Individual Premium - Annual',        period:'yearly',  interval:1, amount:441600 },
    { key:'CLI_STARTER_M',  name:'Blitora Pulse Clinic Starter - Monthly',           period:'monthly', interval:1, amount:49900  },
    { key:'CLI_PRO_M',      name:'Blitora Pulse Clinic Professional - Monthly',      period:'monthly', interval:1, amount:99900  },
    { key:'CLI_PREMIUM_M',  name:'Blitora Pulse Clinic Premium - Monthly',           period:'monthly', interval:1, amount:249900 },
    { key:'CLI_STARTER_A',  name:'Blitora Pulse Clinic Starter - Annual',            period:'yearly',  interval:1, amount:478800 },
    { key:'CLI_PRO_A',      name:'Blitora Pulse Clinic Professional - Annual',       period:'yearly',  interval:1, amount:982800 },
    { key:'CLI_PREMIUM_A',  name:'Blitora Pulse Clinic Premium - Annual',            period:'yearly',  interval:1, amount:2458800},
  ];

  const results = {};
  const errors = [];

  for (const p of plans) {
    try {
      const r = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: p.period, interval: p.interval,
          item: { name: p.name, amount: p.amount, unit_amount: p.amount, currency: 'INR' },
          notes: { key: p.key }
        }),
      });
      const d = await r.json();
      if (d.id) { results[p.key] = d.id; }
      else { errors.push({ key: p.key, error: d.error?.description || 'Unknown error' }); }
    } catch(e) {
      errors.push({ key: p.key, error: e.message });
    }
  }

  const envVars = Object.entries(results)
    .map(([k,v]) => `RAZORPAY_PLAN_${k}=${v}`)
    .join('\n');

  return res.status(200).json({
    success: true,
    created: Object.keys(results).length,
    errors,
    plan_ids: results,
    instructions: 'Add these env vars to Vercel → blitora-pulse → Settings → Environment Variables, then redeploy',
    env_vars_to_add: envVars,
  });
}
