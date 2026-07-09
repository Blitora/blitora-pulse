// components/Layout.js — Blitora Pulse · Dark Theme
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRole, ROLES, isClinicRole } from '../lib/useRole';
import { getSupabase } from '../lib/supabase';
import TrialBanner from './TrialBanner';

const G='#1D9E75', GL='#2AE8A4', N='#0D1B3E', AI='#714B67';

const PATIENT_NAV = [
  { href:'/dashboard', icon:<DashIcon/>,     label:'Home'    },
  { href:'/my-plan',   icon:<PlanIcon/>,     label:'My Plan' },
  { href:'/meals',     icon:<MealsIcon/>,    label:'Meals'   },
  { href:'/log',       icon:<LogIcon/>,      label:'Log'     },
  { href:'/reports',   icon:<RepIcon/>,      label:'Reports' },
  { href:'/profile',   icon:<ProfileIcon/>,  label:'Profile' },
];
const CLINIC_NAV = [
  { href:'/clinic/patients', icon:<PeopleIcon/>, label:'Patients'  },
  { href:'/admin/food',      icon:<MealsIcon/>,  label:'Plans'     },
  { href:'/reports',         icon:<RepIcon/>,    label:'Reports'   },
  { href:'/org/settings',    icon:<OrgIcon/>,    label:'Clinic'    },
];
const SUPER_NAV = [
  { href:'/admin/orgs',   icon:<OrgIcon/>,   label:'Orgs'   },
  { href:'/admin/users',  icon:<PeopleIcon/>,label:'Users'  },
  { href:'/admin/food',   icon:<MealsIcon/>, label:'Food'   },
  { href:'/admin/backup', icon:<RepIcon/>,   label:'Backup' },
];

// ── SVG Nav Icons ──────────────────────────────────────────────────────────
function Ico({children,size=18}){ return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>; }
function PlanIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
function DashIcon()  { return <Ico><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ico>; }
function MealsIcon() { return <Ico><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 0-3 3-3 6s1 4 3 4v8"/></Ico>; }
function LogIcon()   { return <Ico><path d="M3 12h4l3-8 4 16 3-8h4"/></Ico>; }
function RepIcon()   { return <Ico><path d="M4 20V10M10 20V4M16 20v-6M21 20H3"/></Ico>; }
function PeopleIcon(){ return <Ico><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.6a3.4 3.4 0 0 1 0 6.8M21.5 20c0-2.8-1.8-4.5-4.3-5.2"/></Ico>; }
function OrgIcon()   { return <Ico><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01M10 21v-4h4v4"/></Ico>; }
function ProfileIcon(){ return <Ico><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></Ico>; }

// ── Real Blitora Pulse Logo ────────────────────────────────────────────────
function PulseLogo({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <mask id="boltMask">
          <rect width="64" height="64" fill="#fff"/>
          <path d="M37 3 L21 34 L31 34 L25 61 L45 27 L34 27 Z" fill="#000"/>
        </mask>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0D1B3E" stroke="rgba(42,232,164,.5)" strokeWidth="1.5"/>
      <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill={GL}>B</text>
      <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill="#FFFFFF" mask="url(#boltMask)">B</text>
    </svg>
  );
}

export default function Layout({ children }) {
  const router   = useRouter();
  const { role, org, loading } = useRole();
  const [userName, setUserName] = useState('');
  const [streak,   setStreak]   = useState(0);

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await getSupabase().from('profiles').select('full_name,streak').eq('id', session.user.id).single();
      if (p?.full_name) setUserName(p.full_name.split(' ')[0]);
      if (p?.streak)    setStreak(p.streak);
    });
  }, []);

  const nav = role === ROLES.SUPER_ADMIN ? SUPER_NAV : isClinicRole(role) ? CLINIC_NAV : PATIENT_NAV;
  const isPatient = !isClinicRole(role) && role !== ROLES.SUPER_ADMIN;

  async function signOut() {
    await getSupabase().auth.signOut();
    router.replace('/');
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:`3px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  );

  const subLabel = role === ROLES.SUPER_ADMIN ? 'Super Admin'
                 : isClinicRole(role) ? (org?.name || 'Clinic')
                 : userName || 'Health Platform';

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Poppins',Arial,sans-serif" }}>

      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────────── */}
      <aside style={{
        width: 240, background: 'rgba(7,14,34,.6)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,.07)',
        display: 'flex', flexDirection: 'column', padding: '24px 14px',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
        // Hide on mobile
        '@media(max-width:768px)': { display: 'none' },
      }} className="sidebar-desktop">

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'2px 8px', marginBottom:28 }}>
          <PulseLogo size={40}/>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:'.5px', color:'#fff' }}>
              BLITORA <span style={{ color:GL }}>PULSE</span>
            </div>
            <div style={{ fontSize:8.5, color:GL, letterSpacing:'1px', fontWeight:600, marginTop:2 }}>
              Your Health. Simplified.
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding:'0 8px', marginBottom:20 }}>
          <span style={{ background: roleBg(role), color:'#fff', fontSize:10, fontWeight:700, padding:'4px 11px', borderRadius:999, letterSpacing:'.4px' }}>
            {roleLabel(role)}
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1 }}>
          {nav.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href+'/');
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration:'none' }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:11, padding:'12px 14px',
                  borderRadius:13, marginBottom:3, cursor:'pointer', position:'relative',
                  background: active ? 'linear-gradient(90deg,rgba(29,158,117,.22),rgba(29,158,117,.04))' : 'transparent',
                  border: active ? '1px solid rgba(42,232,164,.25)' : '1px solid transparent',
                  color: active ? GL : 'rgba(255,255,255,.5)',
                  transition: 'all .2s',
                }}>
                  {active && <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, background:GL, borderRadius:3, boxShadow:`0 0 10px ${GL}` }}/>}
                  <span style={{ width:20, flexShrink:0 }}>{item.icon}</span>
                  <span style={{ fontSize:13.5, fontWeight: active ? 600 : 500 }}>{item.label}</span>
                  {active && <div style={{ width:6, height:6, borderRadius:'50%', background:GL, marginLeft:'auto', boxShadow:`0 0 8px ${GL}` }}/>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* AI Coach */}
        {isPatient && (
          <Link href="/ai/chat" style={{ textDecoration:'none' }}>
            <div style={{
              margin:'8px 0', padding:'12px 14px', borderRadius:14,
              background:'linear-gradient(120deg,rgba(113,75,103,.35),rgba(113,75,103,.1))',
              border:'1px solid rgba(176,124,165,.4)', display:'flex', alignItems:'center', gap:10, cursor:'pointer',
            }}>
              <span style={{ fontSize:18, animation:'beat 3s ease-in-out infinite' }}>✦</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#DDA8CF' }}>AI Coach</div>
                <div style={{ fontSize:9, color:'rgba(176,124,165,.7)' }}>Ask anything about your health</div>
              </div>
            </div>
          </Link>
        )}

        {/* Streak pill */}
        {streak > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(239,159,39,.1)', border:'1px solid rgba(239,159,39,.3)', borderRadius:13, margin:'8px 0' }}>
            <span style={{ color:'#FFD98A', fontSize:16 }}>⚡</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#FFD98A' }}>{streak}-day streak</div>
              <div style={{ fontSize:9, color:'rgba(255,217,138,.6)' }}>Keep it alive today</div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button onClick={signOut} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:13, borderRadius:10, marginTop:4, width:'100%', textAlign:'left' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main style={{ flex:1, overflowY:'auto', paddingBottom:88, minWidth:0 }}>

        {/* Mobile topbar */}
        <div style={{
          background:'rgba(7,14,34,.85)', backdropFilter:'blur(16px)',
          padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:30, borderBottom:'1px solid rgba(255,255,255,.07)',
        }} className="mobile-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <PulseLogo size={32}/>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1 }}>BLITORA <span style={{ color:GL }}>PULSE</span></div>
              <div style={{ fontSize:8, color:'rgba(255,255,255,.4)', letterSpacing:'1px', textTransform:'uppercase' }}>{subLabel}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {streak > 0 && <div style={{ background:'rgba(239,159,39,.18)', border:'1px solid rgba(239,159,39,.4)', borderRadius:999, padding:'4px 10px', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'#FFD98A' }}><span style={{ color:GL }}>⚡</span>{streak}</div>}
            {isPatient && <Link href="/ai/chat" style={{ textDecoration:'none', background:G, borderRadius:999, padding:'5px 12px', fontSize:11, fontWeight:700, color:'#fff' }}>✦ AI</Link>}
          </div>
        </div>

        {/* Patient inner tabs (mobile) */}
        {isPatient && (
          <div style={{ background:'rgba(7,14,34,.7)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', position:'sticky', top:56, zIndex:29 }} className="mobile-tabs">
            {[{href:'/dashboard',label:'Home'},{href:'/meals',label:'Meals'},{href:'/log',label:'Log'}].map(t => {
              const active = router.pathname === t.href;
              return (
                <Link key={t.href} href={t.href} style={{ textDecoration:'none', flex:1 }}>
                  <div style={{ padding:'11px 0', textAlign:'center', fontSize:12, fontWeight: active ? 700 : 500, color: active ? GL : 'rgba(255,255,255,.4)', borderBottom:`2px solid ${active ? GL : 'transparent'}`, transition:'all .15s' }}>
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

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:40,
        background:'rgba(7,14,34,.92)', backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(255,255,255,.09)',
        display:'flex', paddingBottom:4,
      }} className="mobile-bnav">
        {nav.slice(0,4).map(item => {
          const active = router.pathname === item.href || router.pathname.startsWith(item.href+'/');
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration:'none', flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'9px 0 11px', color: active ? GL : 'rgba(255,255,255,.35)', filter: active ? `drop-shadow(0 0 6px ${GL})` : 'none' }}>
                {item.icon}
                <span style={{ fontSize:9, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                {active && <div style={{ width:4, height:4, borderRadius:'50%', background:GL, boxShadow:`0 0 6px ${GL}` }}/>}
              </div>
            </Link>
          );
        })}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'9px 0 11px', color:'rgba(255,255,255,.25)', cursor:'pointer' }} onClick={signOut}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span style={{ fontSize:9, fontWeight:500 }}>Sign out</span>
        </div>
      </nav>

      <style jsx>{`
        @media(min-width:769px){ .mobile-topbar,.mobile-tabs,.mobile-bnav{display:none!important} }
        @media(max-width:768px){ .sidebar-desktop{display:none!important} }
      `}</style>
    </div>
  );
}

function roleLabel(r){ return {super_admin:'Super Admin',org_admin:'Org Admin',dietitian:'Dietitian',patient:'Patient',unassigned:'Setup'}[r]||''; }
function roleBg(r)   { return {super_admin:'#1E1B4B',org_admin:'#065F46',dietitian:'#1E40AF',patient:'rgba(29,158,117,.4)',unassigned:'#374151'}[r]||'#374151'; }
