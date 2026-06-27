// components/PasswordInput.js
import { useState } from 'react';

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[a-z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function PasswordInput({ value, onChange, label, placeholder, autoComplete, showStrength }) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? getStrength(value) : 0;
  const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Strong', 'Very strong'][strength] || '';
  const strengthColor = ['', '#EF4444', '#EF4444', '#F59E0B', '#10B981', '#059669'][strength] || '#E5E7EB';

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 }}>
          {label}
        </label>
      )}
      <div style={{ position:'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          autoComplete={autoComplete || 'current-password'}
          style={{
            width:'100%', padding:'10px 42px 10px 13px',
            border:'1.5px solid #E5E7EB', borderRadius:10,
            fontSize:'0.85rem', fontFamily:'Inter,sans-serif',
            outline:'none', boxSizing:'border-box',
            color:'#111827', background:'#fff',
          }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{
            position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', padding:0,
            color:'#9CA3AF', fontSize:16, lineHeight:1,
          }}
          tabIndex={-1}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <>
          {/* Strength bar */}
          <div style={{ display:'flex', gap:3, marginTop:6 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                flex:1, height:3, borderRadius:2,
                background: i <= strength ? strengthColor : '#E5E7EB',
                transition:'background .2s',
              }}/>
            ))}
          </div>
          <div style={{ fontSize:'0.65rem', color: strengthColor, marginTop:3, fontWeight:600 }}>
            {strengthLabel}
          </div>
          {/* Requirements checklist */}
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
            {[
              [/.{8,}/, '8+ characters'],
              [/[A-Z]/, 'Uppercase letter'],
              [/[a-z]/, 'Lowercase letter'],
              [/[0-9]/, 'Number'],
            ].map(([regex, text]) => {
              const ok = regex.test(value);
              return (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.65rem', color: ok ? '#10B981' : '#9CA3AF' }}>
                  <span style={{ fontSize:10 }}>{ok ? '✓' : '○'}</span>
                  {text}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
