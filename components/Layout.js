import { useRouter } from "next/router";

const P = "#714B67", PL = "#f3eef1";
const BORDER = "#e5e3ee", TXT2 = "#888", TXT3 = "#bbb", CARD = "#fff";

const NAV_ITEMS = [
  { label: "Home",     icon: "🏠",  href: "/dashboard" },
  { label: "Meals",    icon: "🍽️",  href: "/meals"     },
  { label: "Progress", icon: "📊",  href: "/progress"  },
  { label: "Reports",  icon: "📋",  href: "/reports"   },
  { label: "Profile",  icon: "👤",  href: "/profile"   },
];

const ADMIN_NAV = [
  { label: "Home",     icon: "🏠",  href: "/dashboard"   },
  { label: "Users",    icon: "👥",  href: "/admin"        },
  { label: "Food",     icon: "🥗",  href: "/admin/food"   },
  { label: "Reports",  icon: "📋",  href: "/reports"      },
  { label: "Profile",  icon: "👤",  href: "/profile"      },
];

export default function Layout({ children, title = "Health Tracker", profile }) {
  const router = useRouter();
  const isAdmin = profile?.role === "admin";
  const items = isAdmin ? ADMIN_NAV : NAV_ITEMS;
  const current = router.pathname;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f0f7; font-family: 'Inter', system-ui, sans-serif; color: #2c1a3a; }

        /* ── TOP BAR ── */
        .ht-topbar {
          background: ${CARD};
          border-bottom: 1px solid ${BORDER};
          padding: 0 16px;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .ht-logo {
          width: 32px; height: 32px;
          background: ${P}; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 14px;
          flex-shrink: 0;
        }
        .ht-app-name { font-size: 13px; font-weight: 700; color: ${P}; }
        .ht-page-name { font-size: 12px; color: ${TXT2}; }
        .ht-divider { color: ${BORDER}; font-size: 18px; }
        .ht-saving { font-size: 11px; color: ${P}; animation: ht-pulse 1s infinite; }
        .ht-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: ${PL}; border: none; cursor: pointer;
          color: ${P}; font-weight: 700; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── MAIN CONTENT ── */
        .ht-main {
          max-width: 720px;
          margin: 0 auto;
          padding: 14px 14px 80px;
        }

        /* ── BOTTOM NAV (mobile) ── */
        .ht-bottomnav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: ${CARD};
          border-top: 1px solid ${BORDER};
          display: flex;
          z-index: 20;
          max-width: 720px;
          margin: 0 auto;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
        }
        .ht-navbtn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 4px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 9px;
          font-weight: 500;
          font-family: inherit;
          transition: color .15s;
          color: ${TXT3};
          min-width: 0;
        }
        .ht-navbtn.active { color: ${P}; font-weight: 700; }
        .ht-navbtn .ht-nav-ico { font-size: 20px; line-height: 1; }
        .ht-navbtn .ht-nav-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: ${P}; margin-top: 1px;
          display: none;
        }
        .ht-navbtn.active .ht-nav-dot { display: block; }

        /* ── DESKTOP SIDEBAR ── */
        @media (min-width: 768px) {
          .ht-bottomnav { display: none; }
          .ht-sidebar {
            position: fixed;
            top: 0; left: 0;
            width: 200px;
            height: 100vh;
            background: ${CARD};
            border-right: 1px solid ${BORDER};
            display: flex;
            flex-direction: column;
            padding: 16px 0;
            z-index: 20;
          }
          .ht-sidebar-logo {
            display: flex; align-items: center; gap: 10px;
            padding: 0 16px 20px;
            border-bottom: 1px solid ${BORDER};
            margin-bottom: 12px;
          }
          .ht-sidebar-item {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 16px;
            font-size: 13px; font-weight: 500;
            cursor: pointer;
            border: none; background: none;
            font-family: inherit;
            color: ${TXT2};
            width: 100%;
            text-align: left;
            transition: all .15s;
            border-radius: 0;
          }
          .ht-sidebar-item:hover { background: #faf9fd; color: #2c1a3a; }
          .ht-sidebar-item.active {
            background: ${PL};
            color: ${P};
            font-weight: 600;
            border-right: 3px solid ${P};
          }
          .ht-sidebar-item .s-ico { font-size: 17px; width: 22px; text-align: center; }
          .ht-topbar { margin-left: 200px; }
          .ht-main { margin-left: 200px; padding: 20px 24px 40px; max-width: calc(720px + 200px); }
        }

        /* ── SHARED CARD STYLES ── */
        .ht-card {
          background: ${CARD};
          border-radius: 13px;
          border: 1px solid ${BORDER};
          padding: 14px;
          margin-bottom: 12px;
        }
        .ht-card-title {
          font-size: 11px;
          font-weight: 700;
          color: ${TXT2};
          text-transform: uppercase;
          letter-spacing: .05em;
          margin-bottom: 11px;
        }
        .ht-prow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 0;
          border-bottom: 1px solid ${BORDER};
          font-size: 12px;
        }
        .ht-prow:last-child { border-bottom: none; }
        .ht-badge {
          display: inline-flex;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
        }
        .ht-btn-primary {
          width: 100%;
          padding: 12px;
          background: ${P};
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background .2s;
        }
        .ht-btn-primary:hover { background: #5a3a53; }
        .ht-btn-primary:disabled { background: #b8a0b0; cursor: not-allowed; }
        .ht-btn-outline {
          padding: 8px 16px;
          background: #fff;
          color: ${P};
          border: 1.5px solid ${P};
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background .2s;
        }
        .ht-btn-outline:hover { background: ${PL}; }
        .ht-input {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid ${BORDER};
          border-radius: 9px;
          font-size: 13px;
          color: #2c1a3a;
          outline: none;
          transition: border-color .2s;
          background: #fff;
          font-family: inherit;
        }
        .ht-input:focus { border-color: ${P}; }
        .ht-toast {
          position: fixed;
          bottom: 72px;
          left: 50%;
          transform: translateX(-50%);
          background: ${P};
          color: #fff;
          padding: 8px 20px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 600;
          z-index: 100;
          pointer-events: none;
          animation: ht-fadein .2s ease;
          white-space: nowrap;
        }
        .ht-spinner {
          width: 36px; height: 36px;
          border: 3px solid ${BORDER};
          border-top-color: ${P};
          border-radius: 50%;
          animation: ht-spin .7s linear infinite;
        }
        @keyframes ht-spin { to { transform: rotate(360deg); } }
        @keyframes ht-fadein { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes ht-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

        @media (max-width: 480px) {
          .ht-main { padding: 12px 12px 80px; }
        }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="ht-sidebar" style={{display:"none"}} id="ht-sidebar">
        <div className="ht-sidebar-logo">
          <div className="ht-logo">H</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:P}}>Health Tracker</div>
            <div style={{fontSize:10,color:TXT2}}>{profile?.full_name||""}</div>
          </div>
        </div>
        {items.map(item => (
          <button key={item.href} className={`ht-sidebar-item${current===item.href||current.startsWith(item.href+"/")?" active":""}`}
            onClick={() => router.push(item.href)}>
            <span className="s-ico">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* TOP BAR */}
      <div className="ht-topbar">
        <div className="ht-logo">H</div>
        <span className="ht-app-name">Health Tracker</span>
        <span className="ht-divider">|</span>
        <span className="ht-page-name">{title}</span>
        <div style={{flex:1}}/>
        <button className="ht-avatar" onClick={() => router.push("/profile")}>
          {profile?.full_name?.[0]?.toUpperCase() || "A"}
        </button>
      </div>

      {/* PAGE CONTENT */}
      <div className="ht-main">
        {children}
      </div>

      {/* BOTTOM NAV (mobile + tablet) */}
      <nav className="ht-bottomnav">
        {items.map(item => {
          const isActive = current === item.href || (item.href !== "/dashboard" && current.startsWith(item.href));
          return (
            <button key={item.href} className={`ht-navbtn${isActive ? " active" : ""}`}
              onClick={() => router.push(item.href)}>
              <span className="ht-nav-ico">{item.icon}</span>
              {item.label}
              <span className="ht-nav-dot"/>
            </button>
          );
        })}
      </nav>

      {/* Show sidebar on desktop via JS */}
      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          var s=document.getElementById('ht-sidebar');
          if(s&&window.innerWidth>=768)s.style.display='flex';
          window.addEventListener('resize',function(){
            if(s)s.style.display=window.innerWidth>=768?'flex':'none';
          });
        })();
      `}}/>
    </>
  );
}
