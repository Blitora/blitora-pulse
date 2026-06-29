// lib/resend.js
// Blitora Pulse — Email sending wrapper via Resend API
// All transactional emails go through sendEmail()
// Templates: welcome, invite, trial_warning, trial_expired,
//            password_reset, password_changed, payment_received

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'noreply@blitora.com';
const REPLY_TO = 'asayyed@blitora.com';
const APP_NAME = 'Blitora Pulse';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://azeem-health-tracker.vercel.app';

// ── Core sender ────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent:', subject);
    return { success: false, error: 'No API key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        reply_to: REPLY_TO,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return { success: false, error: data.message || 'Send failed' };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Resend exception:', err);
    return { success: false, error: err.message };
  }
}

// ── Email templates ────────────────────────────────────────────────────────

// 1. Welcome email — sent on signup
export async function sendWelcomeEmail({ to, name, isClinic = false }) {
  return sendEmail({
    to,
    subject: `Welcome to ${APP_NAME}`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#0D1B3E;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;">Blitora Pulse</div>
          <div style="color:#1D9E75;font-size:11px;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">Your Health. Simplified.</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">Welcome, ${name}! 👋</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            ${isClinic
              ? "Your clinic account is ready. You can now invite patients, assign meal plans, and track compliance — all in one place."
              : "Your health account is ready. Start logging your meals, tracking macros, and letting AI give you daily insights."
            }
          </p>
          <a href="${APP_URL}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1D9E75;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Open ${APP_NAME} →
          </a>
          <p style="color:#718096;font-size:12px;margin-top:20px;border-top:1px solid #E0E3ED;padding-top:16px;">
            Questions? Reply to this email — we read everything.
          </p>
        </div>
      </div>
    `,
  });
}

// 2. Patient / Dietitian invite email
export async function sendInviteEmail({ to, inviterName, orgName, role, token }) {
  const inviteUrl = `${APP_URL}/auth/accept-invite?token=${token}`;
  const roleLabel = role === 'dietitian' ? 'dietitian' : 'patient';

  return sendEmail({
    to,
    subject: `${inviterName} invited you to join ${orgName} on ${APP_NAME}`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#0D1B3E;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Blitora Pulse</div>
          <div style="color:#1D9E75;font-size:11px;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">Your Health. Simplified.</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">You've been invited 🎉</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            <strong>${inviterName}</strong> from <strong>${orgName}</strong> has invited you to join as a ${roleLabel}.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1D9E75;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Accept Invitation →
          </a>
          <p style="color:#718096;font-size:12px;">
            This invitation expires in 7 days. If you did not expect this, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

// 3. Trial warning (3 days left) — sent to org admin
export async function sendTrialWarningEmail({ to, name, orgName, daysLeft, trialEndsAt }) {
  return sendEmail({
    to,
    subject: `Your ${APP_NAME} trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#EF9F27;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">⏳ Trial Ending Soon</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">Hi ${name},</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Your ${APP_NAME} trial for <strong>${orgName}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Upgrade now to keep your patient data, meal plans, and AI features without interruption.
          </p>
          <a href="${APP_URL}/org/billing" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1D9E75;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Upgrade Now →
          </a>
        </div>
      </div>
    `,
  });
}

// 4. Trial expired
export async function sendTrialExpiredEmail({ to, name, orgName }) {
  return sendEmail({
    to,
    subject: `Your ${APP_NAME} trial has ended`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#C0392B;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Trial Expired</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">Hi ${name},</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Your trial for <strong>${orgName}</strong> has ended. Your account is now in read-only mode — your data is safe.
          </p>
          <a href="${APP_URL}/org/billing" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1D9E75;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Upgrade to Continue →
          </a>
        </div>
      </div>
    `,
  });
}

// 5. Password changed notification
export async function sendPasswordChangedEmail({ to, name }) {
  return sendEmail({
    to,
    subject: `Your ${APP_NAME} password was changed`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#0D1B3E;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Blitora Pulse</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">Password changed ✓</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Hi ${name}, your password was successfully changed. If you did not make this change, contact us immediately by replying to this email.
          </p>
          <p style="color:#718096;font-size:12px;margin-top:16px;">
            Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>
      </div>
    `,
  });
}

// 6. Account suspended
export async function sendSuspendedEmail({ to, name, reason }) {
  return sendEmail({
    to,
    subject: `Your ${APP_NAME} account has been suspended`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#C0392B;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Account Suspended</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">Hi ${name},</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Your account has been suspended. ${reason ? `Reason: ${reason}` : ''}
          </p>
          <p style="color:#4A5568;font-size:14px;">
            To appeal, reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

// 7. New patient joined — notify dietitian
export async function sendPatientJoinedEmail({ to, dietitianName, patientName, orgName }) {
  return sendEmail({
    to,
    subject: `${patientName} joined ${orgName} on ${APP_NAME}`,
    html: `
      <div style="font-family:'Poppins',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E0E3ED;">
        <div style="background:#0D1B3E;padding:24px 28px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Blitora Pulse</div>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#0D1B3E;font-size:18px;margin-bottom:8px;">New patient joined 🎉</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6;">
            Hi ${dietitianName}, <strong>${patientName}</strong> has joined ${orgName} and is now assigned to you.
          </p>
          <a href="${APP_URL}/clinic/patients" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1D9E75;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            View Patients →
          </a>
        </div>
      </div>
    `,
  });
}
