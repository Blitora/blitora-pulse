// components/TrialBanner.js — NEW FILE
// Shows trial countdown across all pages when org is on trial
// Add inside Layout.js just above {children}

import { useRole } from '../lib/useRole';

export default function TrialBanner() {
  const { org, role } = useRole();

  if (!org || !org.trial_ends_at) return null;
  if (org.plan !== 'trial') return null;
  if (role === 'patient') return null; // patients don't see billing banners

  const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <div style={{ ...s.banner, background:'#FEF2F2', borderBottom:'1px solid #FECACA' }}>
        <span style={{ ...s.text, color:'#DC2626' }}>
          ⚠️ Your trial has expired. Your account is in read-only mode.
        </span>
        <a href="/org/billing" style={{ ...s.btn, background:'#DC2626' }}>Upgrade Now</a>
      </div>
    );
  }

  if (daysLeft <= 2) {
    return (
      <div style={{ ...s.banner, background:'#FEF3C7', borderBottom:'1px solid #FDE68A' }}>
        <span style={{ ...s.text, color:'#92400E' }}>
          ⚠️ Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Upgrade to keep access.
        </span>
        <a href="/org/billing" style={{ ...s.btn, background:'#F59E0B' }}>Upgrade</a>
      </div>
    );
  }

  return (
    <div style={{ ...s.banner, background:'#F0FDF4', borderBottom:'1px solid #A7F3D0' }}>
      <span style={{ ...s.text, color:'#065F46' }}>
        ✓ Free trial — {daysLeft} days remaining
      </span>
      <a href="/org/billing" style={{ ...s.btn, background:'#10B981' }}>View Plans</a>
    </div>
  );
}

const s = {
  banner: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px', fontSize:'0.74rem' },
  text:   { fontWeight:500, fontFamily:'Inter,sans-serif' },
  btn:    { color:'#fff', padding:'5px 14px', borderRadius:8, fontSize:'0.68rem', fontWeight:700, textDecoration:'none', fontFamily:'Inter,sans-serif' },
};
