// pages/profile/security.js — NEW FILE
// Change password while logged in
import { useState } from 'react';
import { getSupabase } from '../../lib/supabase';
const supabase = getSupabase();
import Layout from '../../components/Layout';
import PasswordInput from '../../components/PasswordInput';

export default function SecurityPage() {
  return (
    <Layout>
      <SecurityView />
    </Layout>
  );
}

function SecurityView() {
  const [current,  setCurrent]  = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  function validate() {
    if (!current)                        return 'Enter your current password.';
    if (password.length < 8)             return 'New password must be at least 8 characters.';
    if (!/[A-Z]/.test(password))         return 'Must contain an uppercase letter.';
    if (!/[a-z]/.test(password))         return 'Must contain a lowercase letter.';
    if (!/[0-9]/.test(password))         return 'Must contain a number.';
    if (password !== confirm)            return 'New passwords do not match.';
    if (password === current)            return 'New password cannot be the same as current password.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    setError('');
    setLoading(true);

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser();
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (reAuthErr) { setError('Current password is incorrect.'); setLoading(false); return; }

    // Update password
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Log to password_history
    await supabase.from('password_history').insert({ user_id: user.id, hashed_password: btoa(password.slice(0,8)) });

    // Audit log
    await supabase.from('audit_log').insert({ actor_id: user.id, action: 'password_changed', target_type: 'user', target_id: user.id });

    setSuccess(true);
    setCurrent(''); setPassword(''); setConfirm('');
    setLoading(false);
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.h1}>Security Settings</h1>
        <p style={s.sub}>Change your password. You'll be notified by email after any change.</p>

        {success && <div style={s.success}>✅ Password updated successfully!</div>}
        {error   && <div style={s.err}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <PasswordInput value={current}  onChange={setCurrent}  label="Current password"     autoComplete="current-password" />
          <PasswordInput value={password} onChange={setPassword} label="New password"          autoComplete="new-password" showStrength />
          <PasswordInput value={confirm}  onChange={setConfirm}  label="Confirm new password"  autoComplete="new-password" />

          <div style={s.rules}>
            <div style={s.rulesTitle}>Password must have:</div>
            {[
              [password.length >= 8,         'At least 8 characters'],
              [/[A-Z]/.test(password),       'One uppercase letter'],
              [/[a-z]/.test(password),       'One lowercase letter'],
              [/[0-9]/.test(password),       'One number'],
              [password === confirm && !!confirm, 'Passwords match'],
            ].map(([ok, txt], i) => (
              <div key={i} style={{ fontSize:'0.68rem', color: ok ? '#10B981' : '#9CA3AF', marginTop:3 }}>
                {ok ? '✓' : '○'} {txt}
              </div>
            ))}
          </div>

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page:      { padding:'20px 16px', maxWidth:480, margin:'0 auto' },
  card:      { background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #E5E7EB' },
  h1:        { fontFamily:'Sora,sans-serif', fontSize:'1.2rem', fontWeight:800, color:'#111827', marginBottom:6 },
  sub:       { fontSize:'0.76rem', color:'#6B7280', marginBottom:20 },
  success:   { background:'#F0FDF4', border:'1px solid #A7F3D0', color:'#065F46', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:16 },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:16 },
  rules:     { background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:10, padding:'12px 14px', marginBottom:16 },
  rulesTitle:{ fontSize:'0.7rem', fontWeight:700, color:'#374151', marginBottom:4 },
  btn:       { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' },
};
