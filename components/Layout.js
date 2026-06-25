import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const P = "#714B67", PL = "#f3eef1", PS = "#5a3a53";
const BORDER = "#e5e3ee", TXT = "#2c1a3a", TXT2 = "#888", TXT3 = "#bbb", CARD = "#fff", BG = "#f0f0f7";
const G = "#1D9E75";

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

// ─── NEW LOGO COMPONENT ───────────────────────────────────────────────────────
// Replaces the old "H" purple square everywhere in the app
function MyHealthLogo({ size = "md", showText = true }) {
  const d  = size === "sm" ? 30 : size === "lg" ? 46 : 36;
  const ts = size === "sm" ? 13 : size === "lg" ? 20 : 15;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 7 : 9, flexShrink: 0 }}>
      {/* Icon — purple bg, white ring, green arc + checkmark, MH text */}
      <div style={{
        width: d, height: d,
        borderRadius: Math.round(d * 0.24),
        background: `linear-gradient(140deg, #8B3F7A 0%, #5A1648 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, position: "relative", overflow: "hidden",
        boxShadow: "0 2px 8px rgba(113,75,103,0.30)",
      }}>
        {/* Ring SVG */}
        <svg width={d} height={d} style={{ position: "absolute", inset: 0 }} viewBox="0 0 36 36">
          {/* White arc — left + bottom ~265° */}
          <circle cx="18" cy="18" r="12.5"
            fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="2.8"
            strokeDasharray="52 79" strokeLinecap="round"
            style={{ transform: "rotate(-195deg)", transformOrigin: "18px 18px" }}
          />
          {/* Green arc — top right ~90° */}
          <circle cx="18" cy="18" r="12.5"
            fill="none" stroke="#1D9E75" strokeWidth="2.8"
            strokeDasharray="22 79" strokeLinecap="round"
            style={{ transform: "rotate(105deg)", transformOrigin: "18px 18px" }}
          />
          {/* Green checkmark circle — bottom right */}
          <circle cx="27.5" cy="26.5" r="5" fill="#1D9E75" />
          <path d="M25 26.5 L26.8 28.4 L30 25"
            fill="none" stroke="white" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        {/* MH letters */}
        <span style={{
          fontSize: Math.round(d * 0.33),
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.5px",
          lineHeight: 1,
          zIndex: 1,
          fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
          marginBottom: Math.round(d * 0.03),
        }}>MH</span>
      </div>

      {/* Brand name */}
      {showText && (
        <div>
          <div style={{
            fontSize: ts, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.3px",
            fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
          }}>
            <span style={{ color: P }}>My</span>
            <span style={{ color: G }}>Health</span>
          </div>
          {size === "lg" && (
            <div style={{ fontSize: 9, color: TXT3, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", marginTop: 2 }}>
              Health Tracker
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
            {/* ── NEW LOGO in sidebar ── */}
            <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${BORDER}` }}>
              <MyHealthLogo size="md" showText={true} />
              {profile?.full_name && (
                <div style={{ fontSize: 10, color: TXT2, marginTop: 8, paddingLeft: 2 }}>
                  {profile.full_name}
                </div>
              )}
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

          {/* ── TOP BAR ── */}
          <div style={{
            background: CARD, borderBottom: `1px solid ${BORDER}`,
            padding: "0 16px", height: 52,
            display: "flex", alignItems: "center", gap: 10,
            position: "sticky", top: 0, zIndex: 20,
          }}>
            {/* ── NEW LOGO in mobile top bar ── */}
            {!isDesktop && <MyHealthLogo size="sm" showText={true} />}

            {!isDesktop && <span style={{ color: BORDER, fontSize: 18, marginLeft: 2 }}>|</span>}
            <span style={{
              fontSize: 13,
              fontWeight: isDesktop ? 700 : 400,
              color: isDesktop ? TXT : TXT2,
            }}>{title}</span>
            <div style={{ flex: 1 }} />
            {/* Avatar button */}
            <button onClick={() => router.push("/profile")} style={{
              width: 34, height: 34, borderRadius: "50%",
              background: PL, border: `1.5px solid ${BORDER}`,
              cursor: "pointer", color: P, fontWeight: 700, fontSize: 13,
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
