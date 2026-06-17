import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";
import Layout from "../../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A",RL="#fcebeb";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7";

export default function Admin() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function init() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: profile } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || profile.role !== "admin") { router.push("/dashboard"); return; }
      setMe(profile);
      loadUsers(sb);
    }
    init();
  }, []);

  async function loadUsers(sb) {
    const s = sb || getSupabase();
    const { data } = await s.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function approve(id) {
    await getSupabase().from("profiles").update({ status: "approved" }).eq("id", id);
    showToast("User approved ✓");
    loadUsers();
  }

  async function block(id) {
    await getSupabase().from("profiles").update({ status: "blocked" }).eq("id", id);
    showToast("User blocked");
    loadUsers();
  }

  async function restore(id) {
    await getSupabase().from("profiles").update({ status: "approved" }).eq("id", id);
    showToast("User restored ✓");
    loadUsers();
  }

  const pending  = users.filter(u => u.status === "pending"  && u.role !== "admin");
  const approved = users.filter(u => u.status === "approved" && u.role !== "admin");
  const blocked  = users.filter(u => u.status === "blocked");
  const admins   = users.filter(u => u.role === "admin");

  if (!me) return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: P, borderRadius: "50%", animation: "spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head><title>Admin — Health Tracker</title></Head>
      <style>{`
        .usr-card{background:#fff;border-radius:12px;border:1px solid ${BORDER};padding:14px;margin-bottom:8px}
        .usr-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .usr-av{width:40px;height:40px;border-radius:10px;background:${PL};display:flex;align-items:center;justify-content:center;font-weight:700;color:${P};font-size:16px;flex-shrink:0}
        .usr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .usr-stat{background:${BG};border-radius:8px;padding:7px 8px;text-align:center}
        .sec-title{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .dot{width:7px;height:7px;border-radius:50%;display:inline-block}
        .btn-approve{padding:7px 0;background:${P};color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%;font-family:inherit}
        .btn-block{padding:7px 0;background:#fff;color:${R};border:1.5px solid ${RL};border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%;font-family:inherit}
        .btn-restore{padding:7px 0;background:${GL};color:${G};border:1.5px solid ${G};border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%;font-family:inherit}
        @media(max-width:480px){.usr-stats{grid-template-columns:1fr 1fr}}
      `}</style>

      {toast && <div className="ht-toast">{toast}</div>}

      <Layout title="Admin panel" profile={me}>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin panel</div>
        <div style={{ fontSize: 12, color: TXT2, marginBottom: 20 }}>Manage users and approvals</div>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { l: "Total users", v: users.filter(u => u.role !== "admin").length, c: TXT },
            { l: "Active",      v: approved.length, c: G },
            { l: "Pending",     v: pending.length,  c: A },
            { l: "Blocked",     v: blocked.length,  c: R },
          ].map((k, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 11, border: `1px solid ${BORDER}`, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 10, color: TXT2 }}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* PENDING */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="sec-title"><span className="dot" style={{ background: A }}/> Pending approval ({pending.length})</div>
            {pending.map(u => (
              <div key={u.id} className="usr-card" style={{ borderColor: AL }}>
                <div className="usr-hdr">
                  <div className="usr-av" style={{ background: AL, color: A }}>{u.full_name?.[0] || "?"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: TXT2 }}>{u.email}</div>
                    <div style={{ fontSize: 10, color: TXT3 }}>Registered {new Date(u.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  <span className="ht-badge" style={{ background: AL, color: A }}>Pending</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button className="btn-approve" onClick={() => approve(u.id)}>✓ Approve</button>
                  <button className="btn-block"   onClick={() => block(u.id)}>✕ Block</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVE USERS */}
        <div style={{ marginBottom: 20 }}>
          <div className="sec-title"><span className="dot" style={{ background: G }}/> Active users ({approved.length})</div>
          {approved.length === 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: `1px dashed ${BORDER}`, padding: "28px", textAlign: "center", color: TXT2, fontSize: 13 }}>
              No active users yet. Approve pending users above.
            </div>
          )}
          {approved.map(u => (
            <div key={u.id} className="usr-card">
              <div className="usr-hdr">
                <div className="usr-av" style={{ background: GL, color: G }}>{u.full_name?.[0] || "?"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: TXT2 }}>{u.email}</div>
                  {u.conditions && Object.keys(u.conditions).filter(k=>k!=="none").length > 0 && (
                    <div style={{ fontSize: 10, color: TXT3, marginTop: 2 }}>
                      {Object.keys(u.conditions).filter(k=>k!=="none").join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => router.push(`/admin/users/${u.id}`)} style={{ padding: "5px 12px", border: `1px solid ${BORDER}`, borderRadius: 7, background: "#fff", color: TXT2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>View</button>
                  <button className="btn-block" style={{ width: "auto", padding: "5px 12px" }} onClick={() => block(u.id)}>Block</button>
                </div>
              </div>
              <div className="usr-stats">
                {[
                  { l: "Weight", v: u.weight_current ? `${u.weight_current}kg` : "—" },
                  { l: "Target",  v: u.weight_target  ? `${u.weight_target}kg`  : "—" },
                  { l: "Template",v: u.active_template_id ? "Assigned" : "None" },
                ].map((s, i) => (
                  <div key={i} className="usr-stat">
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: TXT2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ADMIN ACCOUNTS */}
        {admins.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="sec-title"><span className="dot" style={{ background: P }}/> Admin accounts ({admins.length})</div>
            {admins.map(u => (
              <div key={u.id} className="usr-card">
                <div className="usr-hdr">
                  <div className="usr-av">{u.full_name?.[0] || "A"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || "Admin"}</div>
                    <div style={{ fontSize: 11, color: TXT2 }}>{u.email}</div>
                  </div>
                  <span className="ht-badge" style={{ background: PL, color: P, marginLeft: "auto" }}>Admin</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BLOCKED */}
        {blocked.length > 0 && (
          <div>
            <div className="sec-title"><span className="dot" style={{ background: R }}/> Blocked ({blocked.length})</div>
            {blocked.map(u => (
              <div key={u.id} className="usr-card" style={{ opacity: .7 }}>
                <div className="usr-hdr">
                  <div className="usr-av" style={{ background: "#fcebeb", color: R }}>{u.full_name?.[0] || "?"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: TXT2 }}>{u.email}</div>
                  </div>
                </div>
                <button className="btn-restore" onClick={() => restore(u.id)}>Restore access</button>
              </div>
            ))}
          </div>
        )}

      </Layout>
    </>
  );
}
