// components/Layout.js — Blitora Pulse v2 · New prototype UI
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRole, ROLES, isClinicRole } from '../lib/useRole';
import { getSupabase } from '../lib/supabase';
import TrialBanner from './TrialBanner';

const supabase = getSupabase();
const G='#1D9E75', N='#0D1B3E', PU='#714B67', MG='#E0E3ED', LG='#F5F6FA', BG='#718096';

const PATIENT_NAV = [
  { href:'/dashboard', icon:'🏠', label:'Home'    },
  { href:'/meals',     icon:'🍽️',  label:'Meals'   },
  { href:'/reports',   icon:'📊', label:'Reports' },
  { href:'/profile',   icon:'👤', label:'Profile' },
];
const CLINIC_NAV = [
  { href:'/clinic/patients', icon:'👥', label:'Patients'  },
  { href:'/admin/food',      icon:'🥗', label:'Food Plans' },
  { href:'/reports',         icon:'📊', label:'Reports'   },
  { href:'/org/settings',    icon:'🏥', label:'Clinic'    },
  { href:'/profile',         icon:'👤', label:'Profile'   },
];
const SUPER_ADMIN_NAV = [
  { href:'/admin/orgs',   icon:'🏢', label:'Orgs'   },
  { href:'/admin/users',  icon:'👥', label:'Users'  },
  { href:'/admin/food',   icon:'🥗', label:'Food'   },
  { href:'/admin/backup', icon:'💾', label:'Backup' },
];

/* ── Real Blitora Pulse logo (B + lightning bolt + heartbeat line) ── */
function PulseLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="36" fill={N}/>
      <path d="M48 38L48 148L112 148C134 148 152 132 152 112C152 100 146 90 136 84C144 78 150 68 150 56C150 44 138 38 112 38ZM68 58L110 58C120 58 126 64 126 72C126 80 120 86 110 86L68 86ZM68 106L112 106C124 106 132 112 132 120C132 128 124 134 112 134L68 134Z" fill="white"/>
      <polygon points="105,46 84,90 100,90 82,136 124,80 106,80 120,46" fill={G}/>
      <polyline points="20,162 42,162 50,144 60,180 70,152 80,162 180,162" stroke={G} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Layout({ children }) {
  const router = useRouter();
  const { role, org, loading } = useRole();
  const [userName, setUserName] = useState('');
  const [streak, setStreak]     = useState(0);

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await getSupabase().from('profiles').select('full_name,streak').eq('id', session.user.id).single();
      if (p?.full_name) setUserName(p.full_name.split(' ')[0]);
      if (p?.streak)    setStreak(p.streak);
    });
  }, []);

  const nav = role === ROLES.SUPER_ADMIN ? SUPER_ADMIN_NAV
            : isClinicRole(role)         ? CLINIC_NAV
            :                              PATIENT_NAV;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) return <div style={{ minHeight:'100vh', background:LG }} />;

  const subLabel = role === ROLES.SUPER_ADMIN ? 'Super Admin'
                 : isClinicRole(role)          ? (org?.name || 'Clinic')
                 : userName || 'Health Platform';

  const isPatient = !isClinicRole(role) && role !== ROLES.SUPER_ADMIN;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:LG, fontFamily:"'Poppins', Arial, sans-serif" }}>

      {/* ── DESKTOP SIDEBAR (hidden on mobile via @media) ── */}
      <aside style={sb.wrap}>
        {/* Logo */}
        <div style={sb.logoArea}>
          <PulseLogo size={34} />
          <div>
            <div style={sb.logoName}>Blitora <span style={{color:G}}>Pulse</span></div>
            <div style={sb.logoSub}>{subLabel}</div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{padding:'0 12px',marginBottom:16}}>
          <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,color:'#fff',background:roleBg(role),letterSpacing:'0.05em'}}>
            {roleLabel(role)}
          </span>
        </div>

        {/* Nav */}
        <nav style={{flex:1}}>
          {nav.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href+'/');
            return (
              <Link key={item.href} href={item.href} style={{textDecoration:'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,cursor:'pointer',marginBottom:2,background:active?'rgba(29,158,117,0.15)':'transparent',borderRight:active?`3px solid ${G}`:'3px solid transparent',transition:'all .12s'}}>
                  <span style={{fontSize:'1rem',width:22,textAlign:'center',flexShrink:0}}>{item.icon}</span>
                  <span style={{fontSize:'0.78rem',fontWeight:active?700:500,color:active?G:'rgba(255,255,255,0.55)'}}>{item.label}</span>
                  {active && <div style={{width:6,height:6,borderRadius:'50%',background:G,marginLeft:'auto'}}/>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* AI chat link for patients */}
        {isPatient && (
          <Link href="/ai/chat" style={{textDecoration:'none'}}>
            <div style={{margin:'8px 12px',padding:'10px 14px',borderRadius:12,background:'rgba(29,158,117,0.18)',border:'1px solid rgba(29,158,117,0.4)',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <span style={{fontSize:16}}>✦</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#7DF0BF'}}>✦ Pulse AI</div>
                <div style={{fontSize:9,color:'rgba(29,158,117,0.7)'}}>Your health companion</div>
              </div>
            </div>
          </Link>
        )}

        <button style={sb.signOut} onClick={handleSignOut}><span>🚪</span> Sign out</button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{flex:1,paddingBottom:72,overflowY:'auto',minWidth:0}}>

        {/* Mobile topbar — navy with real logo */}
        <div style={mb.topbar}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <PulseLogo size={30}/>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{color:'#fff',fontSize:13,fontWeight:700,lineHeight:1}}>Blitora <span style={{color:G}}>Pulse</span></span>
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:9,textTransform:'uppercase',letterSpacing:'0.06em'}}>{subLabel}</span>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {streak > 0 && (
              <div style={{background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',display:'flex',alignItems:'center',gap:4,color:'#fff',fontSize:11,fontWeight:600}}>
                <span style={{color:G}}>⚡</span>{streak}
              </div>
            )}
            {isPatient && (
              <Link href="/ai/chat" style={{textDecoration:'none'}}>
                <div style={{height:28,background:G,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,padding:'0 10px',gap:4}}>✦ <span>Pulse AI</span></div>
              </Link>
            )}
            {isClinicRole(role) && (
              <span style={{background:'rgba(29,158,117,0.2)',color:G,fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20}}>{roleLabel(role)}</span>
            )}
          </div>
        </div>

        {/* Patient inner tab nav (Home / Meals / Log) */}
        {isPatient && (
          <div style={mb.innerTabBar}>
            {[{href:'/dashboard',label:'Home'},{href:'/meals',label:'Meals'},{href:'/log',label:'Log'}].map(t => {
              const active = router.pathname === t.href;
              return (
                <Link key={t.href} href={t.href} style={{textDecoration:'none',flex:1}}>
                  <div style={{padding:'10px 0',textAlign:'center',fontSize:12,fontWeight:active?700:500,color:active?G:BG,borderBottom:`2px solid ${active?G:'transparent'}`,marginBottom:-1,transition:'all .15s'}}>
                    {t.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <TrialBanner/>
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav style={mb.bnav}>
        {nav.map(item => {
          const active = router.pathname === item.href || router.pathname.startsWith(item.href+'/');
          return (
            <Link key={item.href} href={item.href} style={{textDecoration:'none',flex:1}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 0 12px'}}>
                <span style={{fontSize:18}}>{item.icon}</span>
                <span style={{fontSize:9,fontFamily:"'Poppins',Arial,sans-serif",fontWeight:active?700:500,color:active?G:'#9CA3AF'}}>{item.label}</span>
              </div>
            </Link>
          );
        })}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 0 12px',flex:1,cursor:'pointer'}} onClick={handleSignOut}>
          <span style={{fontSize:18}}>🚪</span>
          <span style={{fontSize:9,fontFamily:"'Poppins',Arial,sans-serif",color:'#9CA3AF'}}>Sign out</span>
        </div>
      </nav>
    </div>
  );
}

function roleLabel(r) { return {super_admin:'Super Admin',org_admin:'Org Admin',dietitian:'Dietitian',patient:'Patient',unassigned:'Setup'}[r]||''; }
function roleBg(r)    { return {super_admin:'#1E1B4B',org_admin:'#065F46',dietitian:'#1E40AF',patient:'#374151'}[r]||'#374151'; }

const N2='#0D1B3E';
const sb = {
  wrap:    {width:220,background:N2,display:'flex',flexDirection:'column',padding:'20px 12px',flexShrink:0},
  logoArea:{display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'4px 8px'},
  logoName:{fontFamily:"'Poppins',Arial,sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#fff'},
  logoSub: {fontSize:'0.54rem',color:'rgba(255,255,255,0.4)',letterSpacing:'0.07em',textTransform:'uppercase',marginTop:1},
  signOut: {display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'0.76rem',borderRadius:10,width:'100%',fontFamily:"'Poppins',Arial,sans-serif"},
};
const mb = {
  topbar:     {background:N2,padding:'11px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:20},
  innerTabBar:{background:'#fff',borderBottom:`1px solid ${MG}`,display:'flex',position:'sticky',top:52,zIndex:19},
  bnav:       {position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #E5E7EB',display:'flex',zIndex:30},
};
