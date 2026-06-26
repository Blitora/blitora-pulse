// components/PasswordInput.js — NEW FILE
// Reusable password field with eye icon + live strength meter
// Usage: <PasswordInput value={pw} onChange={setPw} label="Password" showStrength />

import { useState } from 'react';

export default function PasswordInput({ value, onChange, label='Password', placeholder='••••••••', showStrength=false, name='password', required=true, autoComplete='current-password' }) {
  const [show, setShow] = useState(false);

  const strength = getStrength(value);

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={s.lbl}>{label}</label>}
      <div style={s.wrap}>
        <input
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={s.inp}
        />
        <button type="button" style={s.eye} onClick={() => setShow(v => !v)} tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={s.barRow}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ ...s.barSeg, background: i < strength.score ? strength.color : '#E5E7EB' }} />
            ))}
          </div>
          <div style={{ ...s.strengthLbl, color: strength.color }}>{strength.label}</div>
          {strength.hint && <div style={s.hint}>{strength.hint}</div>}
        </div>
      )}
    </div>
  );
}

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#E5E7EB', hint: '' };
  let score = 0;
  const hints = [];
  if (pw.length >= 8)                    score++; else hints.push('at least 8 characters');
  if (/[A-Z]/.test(pw))                  score++; else hints.push('one uppercase letter');
  if (/[a-z]/.test(pw))                  score++; else hints.push('one lowercase letter');
  if (/[0-9]/.test(pw))                  score++; else hints.push('one number');

  const levels = [
    { label: 'Too weak',  color: '#EF4444' },
    { label: 'Weak',      color: '#F59E0B' },
    { label: 'Fair',      color: '#3B82F6' },
    { label: 'Strong',    color: '#10B981' },
    { label: 'Very strong', color: '#059669' },
  ];
  return {
    score,
    label: levels[score]?.label || '',
    color: levels[score]?.color || '#E5E7EB',
    hint:  hints.length > 0 ? `Add ${hints.join(', ')}` : '',
  };
}

const s = {
  lbl:        { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5, fontFamily:'Inter,sans-serif' },
  wrap:       { position:'relative', display:'flex', alignItems:'center' },
  inp:        { width:'100%', padding:'10px 40px 10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', color:'#111827', background:'#fff', boxSizing:'border-box' },
  eye:        { position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'4px', lineHeight:1 },
  barRow:     { display:'flex', gap:4 },
  barSeg:     { flex:1, height:4, borderRadius:99, transition:'background 0.2s' },
  strengthLbl:{ fontSize:'0.65rem', fontWeight:700, marginTop:3 },
  hint:       { fontSize:'0.62rem', color:'#6B7280', marginTop:2 },
};
