// components/Layout.js
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRole, ROLES, isClinicRole } from '../lib/useRole';
import { getSupabase } from '../lib/supabase';
import TrialBanner from './TrialBanner';
const supabase = getSupabase();

const G = '#1D9E75', N = '#0D1B3E', BORDER = '#E0E3ED';

const PATIENT_NAV = [
  { href:'/dashboard',        icon:'🏠', label:'Home'      },
  { href:'/meals',            icon:'🍽️',  label:'Meals'     },
  { href:'/reports',          icon:'📈', label:'Reports'   },
  { href:'/profile',          icon:'👤', label:'Profile'   },
];

const CLINIC_NAV = [
  { href:'/clinic/patients',  icon:'👥', label:'Patients'  },
  { href:'/admin/food',       icon:'🥗', label:'Food Plans' },
  { href:'/reports',          icon:'📈', label:'Reports'   },
  { href:'/org/settings',     icon:'🏥', label:'Clinic'    },
  { href:'/profile',          icon:'👤', label:'Profile'   },
];

const SUPER_ADMIN_NAV = [
  { href:'/admin/orgs',       icon:'🏢', label:'Orgs'      },
  { href:'/admin/users',      icon:'👥', label:'Users'     },
  { href:'/admin/food',       icon:'🥗', label:'Food Plans' },
  { href:'/admin/backup',     icon:'💾', label:'Backup'    },
];

// Blitora Pulse logo — B with heartbeat pulse line in navy/green
function PulseLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill={N} />
      <text x="7" y="29" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="26" fill={G}>B</text>
      <polyline points="6,24 12,24 15,18 18,28 21,20 24,24 34,24" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export default function Layout({ children }) {
  const router  = useRouter();
  const { role, org, loading } = useRole();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await getSupabase()
        .from('profiles').select('full_name').eq('id', session.user.id).single();
      if (p?.full_name) setUserName(p.full_name.split(' ')[0]);
    });
  }, []);

  const nav = role === ROLES.SUPER_ADMIN ? SUPER_ADMIN_NAV
            : isClinicRole(role)         ? CLINIC_NAV
            :                              PATIENT_NAV;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#F7F8FA' }} />;

  const subLabel = role === ROLES.SUPER_ADMIN ? 'Super Admin'
                 : isClinicRole(role)          ? (org?.name || 'Clinic')
                 : userName                    ? userName
                 :                               'Health Platform';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F7F8FA' }}>

      {/* DESKTOP SIDEBAR */}
      <aside style={sb.wrap}>
        <div style={sb.logoArea}>
          <PulseLogo size={36} />
          <div>
            <div style={sb.logoName}>Blitora Pulse</div>
            <div style={sb.logoTag}>{subLabel}</div>
          </div>
        </div>

        <div style={sb.roleBadge}>
          <span style={{ ...sb.rolePill, background: roleBg(role) }}>
            {roleLabel(role)}
          </span>
        </div>

        <nav style={{ flex:1 }}>
          {nav.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration:'none' }}>
                <div style={{ ...sb.navItem, ...(active ? sb.navActive : {}) }}>
                  <span style={sb.navIcon}>{item.icon}</span>
                  <span style={{ ...sb.navLabel, ...(active ? sb.navLabelActive : {}) }}>{item.label}</span>
                  {active && <div style={sb.navDot} />}
                </div>
              </Link>
            );
          })}
        </nav>

        <button style={sb.signOut} onClick={handleSignOut}>
          <span>🚪</span> Sign out
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex:1, paddingBottom:80, overflowY:'auto' }}>
        <div style={mb.topbar}>
          <div style={mb.logoRow}>
            <PulseLogo size={30} />
            <div>
              <div style={mb.logoName}>Blitora Pulse</div>
              <div style={mb.logoTag}>
                {isClinicRole(role) ? (org?.name || 'Clinic') : userName ? userName : 'Health Platform'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isClinicRole(role) && (
              <span style={mb.clinicBadge}>{roleLabel(role)}</span>
            )}
          </div>
        </div>
        <TrialBanner />
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav style={mb.bnav}>
        {nav.map(item => {
          const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration:'none', flex:1 }}>
              <div style={mb.bnavItem}>
                <span style={{ fontSize:'1.1rem' }}>{item.icon}</span>
                <span style={{ ...mb.bnavLabel, ...(active ? mb.bnavActive : {}) }}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
        <div style={{ ...mb.bnavItem, flex:1, cursor:'pointer' }} onClick={handleSignOut}>
          <span style={{ fontSize:'1.1rem' }}>🚪</span>
          <span style={mb.bnavLabel}>Sign out</span>
        </div>
      </nav>
    </div>
  );
}

function roleLabel(role) {
  return { super_admin:'Super Admin', org_admin:'Org Admin', dietitian:'Dietitian', patient:'Patient', unassigned:'Setup' }[role] || '';
}
function roleBg(role) {
  return { super_admin:'#1E1B4B', org_admin:'#065F46', dietitian:'#1E40AF', patient:'#374151' }[role] || '#374151';
}

const N2 = '#0D1B3E';
const sb = {
  wrap:           { width:220, background:N2, display:'flex', flexDirection:'column', padding:'20px 12px', flexShrink:0 },
  logoArea:       { display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'4px 8px' },
  logoName:       { fontFamily:"'Poppins', Arial, sans-serif", fontSize:'0.9rem', fontWeight:700, color:'#fff', letterSpacing:'-0.01em' },
  logoTag:        { fontSize:'0.54rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.07em', textTransform:'uppercase', marginTop:1 },
  roleBadge:      { padding:'0 8px', marginBottom:16 },
  rolePill:       { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:'0.6rem', fontWeight:700, color:'#fff', letterSpacing:'0.05em' },
  navItem:        { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', transition:'background 0.12s', marginBottom:2, position:'relative' },
  navActive:      { background:'rgba(29,158,117,0.15)' },
  navIcon:        { fontSize:'1rem', width:22, textAlign:'center', flexShrink:0 },
  navLabel:       { fontSize:'0.78rem', fontWeight:500, color:'rgba(255,255,255,0.55)' },
  navLabelActive: { color:'#1D9E75', fontWeight:700 },
  navDot:         { width:6, height:6, borderRadius:'50%', background:'#1D9E75', marginLeft:'auto' },
  signOut:        { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.76rem', borderRadius:10, width:'100%', fontFamily:"'Poppins', Arial, sans-serif" },
};

const mb = {
  topbar:      { background:'#fff', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #E5E7EB', position:'sticky', top:0, zIndex:10 },
  logoRow:     { display:'flex', alignItems:'center', gap:8 },
  logoName:    { fontFamily:"'Poppins', Arial, sans-serif", fontSize:'0.88rem', fontWeight:700, color:N2, letterSpacing:'-0.01em' },
  logoTag:     { fontSize:'0.5rem', color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase', marginTop:1 },
  clinicBadge: { background:'#E1F5EE', color:'#0D6B4E', fontSize:'0.6rem', fontWeight:700, padding:'3px 9px', borderRadius:20 },
  bnav:        { position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #E5E7EB', display:'flex', zIndex:20 },
  bnavItem:    { display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 0 12px' },
  bnavLabel:   { fontSize:'0.52rem', color:'#9CA3AF', fontWeight:500, fontFamily:"'Poppins', Arial, sans-serif" },
  bnavActive:  { color:'#1D9E75', fontWeight:700 },
};
