// pages/api/ai/send-patient-invite.js
// Sends invite email to patient with their generated plan summary
import { sendInviteEmail } from '../../../lib/resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, name, token, orgName, plan } = req.body;
  try {
    await sendInviteEmail({
      to: email,
      inviterName: orgName,
      orgName,
      role: 'patient',
      token,
      patientName: name,
      planSummary: plan ? `Your personalised ${plan.totalCal} kcal/day meal plan is ready and waiting for you.` : null,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Invite email error:', e);
    res.json({ ok: false, error: e.message }); // non-fatal
  }
}
