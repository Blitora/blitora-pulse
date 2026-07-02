// pages/api/lead-capture.js
// Stores brochure download leads and sends notification email
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, document: doc, source } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

  try {
    // Notify you of the lead
    await resend.emails.send({
      from: 'Blitora Pulse <onboarding@resend.dev>',
      to: ['asayyed@blitora.com'],
      replyTo: email,
      subject: `📥 New brochure download — ${doc} — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#0D1B3E;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:16px;">New brochure download lead</h2>
          </div>
          <div style="background:#F5F6FA;padding:28px;border-radius:0 0 12px 12px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:7px 0;color:#718096;font-size:12px;width:110px;font-weight:700;text-transform:uppercase;">Name</td><td style="padding:7px 0;color:#0D1B3E;font-size:15px;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:7px 0;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;">Email</td><td style="padding:7px 0;font-size:15px;"><a href="mailto:${email}" style="color:#E8560A;">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding:7px 0;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;">Mobile</td><td style="padding:7px 0;color:#0D1B3E;font-size:15px;">${phone}</td></tr>` : ''}
              <tr><td style="padding:7px 0;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;">Document</td><td style="padding:7px 0;color:#1D9E75;font-size:15px;font-weight:600;">${doc}</td></tr>
              <tr><td style="padding:7px 0;color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;">Source</td><td style="padding:7px 0;color:#718096;font-size:14px;">${source || 'website'}</td></tr>
            </table>
          </div>
        </div>
      `,
    });

    // Send download link to user
    await resend.emails.send({
      from: 'Blitora Pulse <onboarding@resend.dev>',
      to: [email],
      subject: `Your ${doc} from Blitora Pulse`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#0D1B3E;padding:24px 28px;border-radius:12px 12px 0 0;">
            <div style="font-weight:800;font-size:16px;color:#fff;letter-spacing:-0.3px;">BLITORA <span style="color:#1D9E75;font-size:11px;font-weight:700;letter-spacing:0.2em;">PULSE</span></div>
          </div>
          <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #E0E3ED;border-top:none;">
            <h2 style="color:#0D1B3E;font-size:20px;margin:0 0 12px;">Hi ${name},</h2>
            <p style="color:#4A5568;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Thanks for your interest in Blitora Pulse. Here's your copy of the <strong>${doc}</strong>.
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <a href="https://pulse.blitora.com#resources" 
                 style="display:inline-block;padding:14px 32px;background:#1D9E75;color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;">
                📥 Download ${doc}
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #E0E3ED;margin:0 0 20px;"/>
            <p style="color:#718096;font-size:13px;line-height:1.6;margin:0;">
              While you have it — want to try Blitora Pulse free for 30 days?<br/>
              <a href="https://pulse.blitora.com/signup" style="color:#1D9E75;font-weight:600;">Start your free trial →</a>
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead capture error:', err);
    // Don't fail — the download should still happen client-side
    return res.status(200).json({ ok: true, note: 'email failed silently' });
  }
}
