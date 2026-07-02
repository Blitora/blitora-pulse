// lib/razorpayPlans.js
// Razorpay plan IDs — populated by /api/payments/setup-plans on first run
// Plans are created in TEST mode; switch to live keys + re-run setup for production

export const PLAN_IDS = {
  // Individual - Monthly
  IND_STARTER_M:  process.env.RAZORPAY_PLAN_IND_STARTER_M  || null,
  IND_PLUS_M:     process.env.RAZORPAY_PLAN_IND_PLUS_M     || null,
  IND_PREMIUM_M:  process.env.RAZORPAY_PLAN_IND_PREMIUM_M  || null,
  // Individual - Annual
  IND_STARTER_A:  process.env.RAZORPAY_PLAN_IND_STARTER_A  || null,
  IND_PLUS_A:     process.env.RAZORPAY_PLAN_IND_PLUS_A     || null,
  IND_PREMIUM_A:  process.env.RAZORPAY_PLAN_IND_PREMIUM_A  || null,
  // Clinic - Monthly
  CLI_STARTER_M:  process.env.RAZORPAY_PLAN_CLI_STARTER_M  || null,
  CLI_PRO_M:      process.env.RAZORPAY_PLAN_CLI_PRO_M      || null,
  CLI_PREMIUM_M:  process.env.RAZORPAY_PLAN_CLI_PREMIUM_M  || null,
  // Clinic - Annual
  CLI_STARTER_A:  process.env.RAZORPAY_PLAN_CLI_STARTER_A  || null,
  CLI_PRO_A:      process.env.RAZORPAY_PLAN_CLI_PRO_A      || null,
  CLI_PREMIUM_A:  process.env.RAZORPAY_PLAN_CLI_PREMIUM_A  || null,
};

export function getPlanKey(audience, plan, billing) {
  const a = audience === 'individual' ? 'IND' : 'CLI';
  const p = { starter:'STARTER', plus:'PLUS', premium:'PREMIUM', professional:'PRO' }[plan.toLowerCase()] || 'STARTER';
  const b = billing === 'annual' ? 'A' : 'M';
  return `${a}_${p}_${b}`;
}
