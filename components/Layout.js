import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const P = "#714B67", PL = "#f3eef1", PS = "#5a3a53";
const BORDER = "#e5e3ee", TXT = "#2c1a3a", TXT2 = "#888", TXT3 = "#bbb", CARD = "#fff", BG = "#f0f0f7";

const USER_NAV = [
  { label: "Home",     icon: "🏠",  href: "/dashboard" },
  { label: "Meals",    icon: "🍽️",  href: "/meals"     },
  { label: "Progress", icon: "📊",  href: "/progress"  },
  { label: "Reports",  icon: "📋",  href: "/reports"   },
  { label: "Profile",  icon: "👤",  href: "/profile"   },
];

const ADMIN_NAV = [
  { label: "Home",    icon: "🏠",  href: "/dashboard" },
  { label: "Users",   icon: "👥",  href: "/admin"     },
  { label: "Food",    icon: "🥗",  href: "/admin/food"},
  { label: "Reports", icon: "📋",  href: "/reports"   },
  { label: "Profile", icon: "👤",  href: "/profile"   },
];

export default function Layout({ children, title = "Health Tracker", profile }) {
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isAdmin = profile?.role === "admin";
  const items = isAdmin ? ADMIN_NAV : USER_NAV;
  const current = router.pathname;

  function isActive(href) {
    if (href === "/dashboard") return current === "/dashboard";
    if (href === "/admin") return current === "/admin";
    return current.startsWith(href);
  }

  const SidebarItem = ({ item }) => (
    <button onClick={() => router.push(item.href)} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 20px", width: "100%",
      border: "none", borderLeft: isActive(item.href) ? `3px solid ${P}` : "3px solid transparent",
      background: isActive(item.href) ? PL : "transparent",
      color: isActive(item.href) ? P : TXT2,
      fontFamily: "inherit", fontSize: 13, fontWeight: isActive(item.href) ? 600 : 500,
      cursor: "pointer", textAlign: "left", transition: "all .15s",
    }}>
      <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{item.icon}</span>
      {item.label}
    </button>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; font-family: 'Inter', system-ui, sans-serif; color: ${TXT}; }
        .ht-card { background: ${CARD}; border-radius: 13px; border: 1px solid ${BORDER}; padding: 14px; margin-bottom: 12px; }
        .ht-card-title { font-size: 11px; font-weight: 700; color: ${TXT2}; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 11px; }
        .ht-badge { display: inline-flex; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; }
        .ht-toast { position: fixed; bottom: 72px; left: 50%; transform: translateX(-50%); background: ${P}; color: #fff; padding: 8px 20px; border-radius: 24px; font-size: 12px; font-weight: 600; z-index: 200; pointer-events: none; white-space: nowrap; animation: htfadein .2s ease; }
        .ht-btn-primary { width: 100%; padding: 12px; background: ${P}; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ht-btn-primary:hover { background: ${PS}; }
        .ht-btn-primary:disabled { background: #b8a0b0; cursor: not-allowed; }
        .ht-input { width: 100%; padding: 9px 12px; border: 1.5px solid ${BORDER}; border-radius: 9px; font-size: 13px; color: ${TXT}; outline: none; background: ${CARD}; font-family: inherit; }
        .ht-input:focus { border-color: ${P}; }
        .ht-spinner { width: 36px; height: 36px; border: 3px solid ${BORDER}; border-top-color: ${P}; border-radius: 50%; animation: htspin .7s linear infinite; }
        @keyframes htspin { to { transform: rotate(360deg); } }
        @keyframes htfadein { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes htpulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── DESKTOP SIDEBAR ── */}
        {isDesktop && (
          <div style={{
            width: 210, flexShrink: 0, background: CARD,
            borderRight: `1px solid ${BORDER}`,
            position: "fixed", top: 0, left: 0, height: "100vh",
            display: "flex", flexDirection: "column",
            zIndex: 30,
          }}>
            {/* Logo */}
            <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, background: P, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>H</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P, lineHeight: 1.2 }}>Health Tracker</div>
                  <div style={{ fontSize: 10, color: TXT2 }}>{profile?.full_name || ""}</div>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <div style={{ flex: 1, paddingTop: 8, overflowY: "auto" }}>
              {items.map(item => <SidebarItem key={item.href} item={item} />)}
            </div>

            {/* Bottom */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, color: TXT3 }}>Logged in as</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: TXT2, marginTop: 2 }}>{profile?.email || ""}</div>
            </div>
          </div>
        )}

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, marginLeft: isDesktop ? 210 : 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

          {/* Top bar */}
          <div style={{
            background: CARD, borderBottom: `1px solid ${BORDER}`,
            padding: "0 16px", height: 52,
            display: "flex", alignItems: "center", gap: 10,
            position: "sticky", top: 0, zIndex: 20,
          }}>
            {!isDesktop && (
              <div style={{ width: 32, height: 32, background: P, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>H</div>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: P }}>{isDesktop ? "" : "Health Tracker"}</span>
            {!isDesktop && <span style={{ color: BORDER, fontSize: 18 }}>|</span>}
            <span style={{ fontSize: 13, fontWeight: isDesktop ? 700 : 400, color: isDesktop ? TXT : TXT2 }}>{title}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => router.push("/profile")} style={{
              width: 34, height: 34, borderRadius: "50%",
              background: PL, border: "none", cursor: "pointer",
              color: P, fontWeight: 700, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {profile?.full_name?.[0]?.toUpperCase() || "A"}
            </button>
          </div>

          {/* Page content */}
          <div style={{
            flex: 1,
            padding: isDesktop ? "20px 28px 40px" : "14px 14px 80px",
            maxWidth: isDesktop ? 900 : "100%",
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile only) ── */}
      {!isDesktop && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: CARD, borderTop: `1px solid ${BORDER}`,
          display: "flex", zIndex: 30,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
        }}>
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <button key={item.href} onClick={() => router.push(item.href)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, padding: "8px 4px",
                border: "none", background: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 9,
                fontWeight: active ? 700 : 500,
                color: active ? P : TXT3,
                transition: "color .15s",
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
                {active && <span style={{ width: 4, height: 4, borderRadius: "50%", background: P, marginTop: 1 }} />}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
