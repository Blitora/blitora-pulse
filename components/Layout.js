// components/Layout.js
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useRole, ROLES, isClinicRole } from '../lib/useRole';
import { getSupabase } from '../lib/supabase';
const supabase = getSupabase();

const PATIENT_NAV = [
  { href:'/dashboard',        icon:'🏠', label:'Home'     },
  { href:'/meals',            icon:'🍽️',  label:'Meals'    },
  { href:'/reports',          icon:'📈', label:'Reports'  },
  { href:'/profile',          icon:'👤', label:'Profile'  },
  ];

const CLINIC_NAV = [
  { href:'/clinic/patients',  icon:'👥',  label:'Patients' },
  { href:'/reports',          icon:'📈', label:'Reports'  },
  { href:'/org/settings',     icon:'🏥', label:'Clinic'   },
  { href:'/profile',          icon:'👤', label:'Profile'  },
  ];

const SUPER_ADMIN_NAV = [
  { href:'/admin/orgs',       icon:'🏢', label:'Orgs'     },
  { href:'/admin/users',      icon:'👥', label:'Users'    },
  { href:'/admin/backup',     icon:'💾', label:'Backup'   },
  ];

export default function Layout({ children }) {
    const router  = useRouter();
    const { role, org, loading } = useRole();

  const nav = role === ROLES.SUPER_ADMIN ? SUPER_ADMIN_NAV
                : isClinicRole(role)         ? CLINIC_NAV
                :                              PATIENT_NAV;

  async function handleSignOut() {
        await supabase.auth.signOut();
        router.replace('/');
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#F7F8FA' }} />;

  return (
        <div style={{ display:'flex', minHeight:'100vh', background:'#F7F8FA' }}>

{/* DESKTOP SIDEBAR */}
      <aside style={sb.wrap}>
        <div style={sb.logoArea}>
          <div style={sb.logoIcon}>🌿</div>
          <div>
                    <div style={sb.logoName}>VitaLog</div>
            <div style={sb.logoTag}>
      {role === ROLES.SUPER_ADMIN ? 'Super Admin'
                      : isClinicRole(role)       ? (org?.name || 'Clinic')
                      :                            'Health Platform'}
        </div>
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
            <div style={mb.logoIcon}>🌿</div>
            <div>
                      <div style={mb.logoName}>VitaLog</div>
              <div style={mb.logoTag}>
      {isClinicRole(role) ? (org?.name || 'Clinic') : 'Health Platform'}
</div>
  </div>
  </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
{isClinicRole(role) && (
                <span style={mb.clinicBadge}>{roleLabel(role)}</span>
             )}
</div>
  </div>
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

const sb = {
    wrap:          { width:220, background:'#1A1D23', display:'flex', flexDirection:'column', padding:'20px 12px', flexShrink:0 },
    logoArea:      { display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'4px 8px' },
    logoIcon:      { width:36, height:36, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 },
    logoName:      { fontFamily:'Sora,sans-serif', fontSize:'0.95rem', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' },
    logoTag:       { fontSize:'0.54rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.07em', textTransform:'uppercase', marginTop:1 },
    roleBadge:     { padding:'0 8px', marginBottom:16 },
    rolePill:      { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:'0.6rem', fontWeight:700, color:'#fff', letterSpacing:'0.05em' },
    navItem:       { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', transition:'background 0.12s', marginBottom:2, position:'relative' },
    navActive:     { background:'rgba(16,185,129,0.15)' },
    navIcon:       { fontSize:'1rem', width:22, textAlign:'center', flexShrink:0 },
    navLabel:      { fontSize:'0.78rem', fontWeight:500, color:'rgba(255,255,255,0.55)' },
    navLabelActive:{ color:'#10B981', fontWeight:700 },
    navDot:        { width:6, height:6, borderRadius:'50%', background:'#10B981', marginLeft:'auto' },
    signOut:       { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.76rem', borderRadius:10, width:'100%', fontFamily:'Inter,sans-serif' },
};

const mb = {
    topbar:      { background:'#fff', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #E5E7EB', position:'sticky', top:0, zIndex:10 },
    logoRow:     { display:'flex', alignItems:'center', gap:8 },
    logoIcon:    { width:32, height:32, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 },
    logoName:    { fontFamily:'Sora,sans-serif', fontSize:'0.9rem', fontWeight:800, color:'#111827', letterSpacing:'-0.02em' },
    logoTag:     { fontSize:'0.5rem', color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase', marginTop:1 },
    clinicBadge: { background:'#EDE9FE', color:'#5B21B6', fontSize:'0.6rem', fontWeight:700, padding:'3px 9px', borderRadius:20 },
    bnav:        { position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #E5E7EB', display:'flex', zIndex:20 },
    bnavItem:    { display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 0 12px' },
    bnavLabel:   { fontSize:'0.52rem', color:'#9CA3AF', fontWeight:500, fontFamily:'Inter,sans-serif' },
    bnavActive:  { color:'#10B981', fontWeight:700 },
};
