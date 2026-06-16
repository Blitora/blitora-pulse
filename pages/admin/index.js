import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function init() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: profile } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || profile.role !== "admin") { router.push("/dashboard"); return; }
      setMe(profile);
      loadUsers();
    }
    init();
  }, []);

  async function loadUsers() {
    const { data } = await getSupabase().from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function approve(id) {
    await getSupabase().from("profiles").update({ status: "approved" }).eq("id", id);
    showToast("User approved");
    loadUsers();
  }

  async function block(id) {
    await getSupabase().from("profiles").update({ status: "blocked" }).eq("id", id);
    showToast("User blocked");
    loadUsers();
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    router.push("/login");
  }

  const pending = users.filter(u => u.status === "pending" && u.role !== "admin");
  const approved = users.filter(u => u.status === "approved" && u.role !== "admin");
  const blocked = users.filter(u => u.status === "blocked");

  return (
    <>
      <Head><title>Admin — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f0f0f7;font-family:'Inter',system-ui,sans-serif}
        .sidebar{width:56px;background:#714B67;min-height:100vh;position:fixed;top:0;left:0;display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:6px;z-index:10}
        .sico{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;transition:all .15s}
        .sico:hover,.sico.act{background:rgba(255,255,255,0.15);color:#fff}
        .topbar{margin-left:56px;background:#fff;border-bottom:1px solid #e5e3ee;padding:0 24px;height:52px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:9}
        .main{margin-left:56px;padding:24px}
        .page-title{font-size:20px;font-weight:700;color:#2c1a3a;margin-bottom:4px}
        .page-sub{font-size:13px;color:#888;margin-bottom:24px}
        .section-title{font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
        .card{background:#fff;border-radius:12px;border:1px solid #e5e3ee;margin-bottom:8px;padding:16px;display:flex;align-items:center;gap:14px}
        .avatar{width:40px;height:40px;border-radius:10px;background:#eeedfe;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#534AB7;flex-shrink:0}
        .user-name{font-size:14px;font-weight:600;color:#2c1a3a}
        .user-email{font-size:12px;color:#888;margin-top:2px}
        .user-date{font-size:11px;color:#bbb;margin-top:2px}
        .actions{display:flex;gap:8px;margin-left:auto;flex-shrink:0}
        .btn-approve{padding:6px 16px;background:#714B67;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:background .2s}
        .btn-approve:hover{background:#5a3a53}
        .btn-block{padding:6px 14px;background:#fff;color:#c0392b;border:1px solid #ffd0d0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
        .btn-block:hover{background:#fff0f0}
        .btn-view{padding:6px 14px;background:#f0f0f7;color:#444;border:1px solid #e5e3ee;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer}
        .empty{text-align:center;padding:32px;color:#bbb;font-size:13px;background:#fff;border-radius:12px;border:1px dashed #e5e3ee}
        .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .kpi{background:#fff;border-radius:12px;border:1px solid #e5e3ee;padding:16px}
        .kpi-val{font-size:24px;font-weight:700;margin-bottom:4px}
        .kpi-label{font-size:12px;color:#888}
        .toast{position:fixed;bottom:24px;right:24px;background:#714B67;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;animation:fadein .2s ease}
        @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .dot{width:8px;height:8px;border-radius:50%;animation:pulse 1.5s infinite;display:inline-block;margin-right:4px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      <div className="sidebar">
        <div style={{width:36,height:36,background:"#9c6b8e",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,marginBottom:8}}>A</div>
        <div className="sico act" title="Admin panel">⚙</div>
        <div className="sico" title="Dashboard" onClick={()=>router.push("/dashboard")}>⊞</div>
        <div style={{flex:1}}/>
        <div className="sico" title="Sign out" onClick={signOut}>⇥</div>
      </div>

      <div className="topbar">
        <span style={{fontSize:14,fontWeight:700,color:"#714B67"}}>Health Tracker</span>
        <span style={{color:"#e0ddef"}}>|</span>
        <span style={{fontSize:13,color:"#888"}}>Admin panel</span>
        <div style={{flex:1}}/>
        <div style={{width:32,height:32,borderRadius:"50%",background:"#714B67",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>
          {me?.full_name?.[0]?.toUpperCase()||"A"}
        </div>
      </div>

      <div className="main">
        <div className="page-title">Admin panel</div>
        <div className="page-sub">Manage users and approvals</div>

        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-val" style={{color:"#EF9F27"}}>{pending.length}</div>
            <div className="kpi-label">Pending approval</div>
          </div>
          <div className="kpi">
            <div className="kpi-val" style={{color:"#1D9E75"}}>{approved.length}</div>
            <div className="kpi-label">Active users</div>
          </div>
          <div className="kpi">
            <div className="kpi-val" style={{color:"#2c1a3a"}}>{users.filter(u=>u.role!=="admin").length}</div>
            <div className="kpi-label">Total users</div>
          </div>
        </div>

        {pending.length > 0 && (
          <div style={{marginBottom:24}}>
            <div className="section-title">
              <span className="dot" style={{background:"#EF9F27"}}/>
              Pending approval ({pending.length})
            </div>
            {pending.map(u => (
              <div key={u.id} className="card">
                <div className="avatar">{u.full_name?.[0]?.toUpperCase()||"?"}</div>
                <div>
                  <div className="user-name">{u.full_name||"Unknown"}</div>
                  <div className="user-email">{u.email}</div>
                  <div className="user-date">Registered {new Date(u.created_at).toLocaleDateString("en-IN")}</div>
                </div>
                <div className="actions">
                  <button className="btn-approve" onClick={()=>approve(u.id)}>Approve</button>
                  <button className="btn-block" onClick={()=>block(u.id)}>Block</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginBottom:24}}>
          <div className="section-title">
            <span className="dot" style={{background:"#1D9E75"}}/>
            Active users ({approved.length})
          </div>
          {approved.length === 0
            ? <div className="empty">No active users yet</div>
            : approved.map(u => (
              <div key={u.id} className="card">
                <div className="avatar" style={{background:"#e1f5ee",color:"#0F6E56"}}>{u.full_name?.[0]?.toUpperCase()||"?"}</div>
                <div>
                  <div className="user-name">{u.full_name||"Unknown"}</div>
                  <div className="user-email">{u.email}</div>
                  <div className="user-date">
                    {u.weight_start && `Start: ${u.weight_start}kg`}
                    {u.weight_current && ` · Current: ${u.weight_current}kg`}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn-view" onClick={()=>router.push(`/admin/users/${u.id}`)}>View logs</button>
                  <button className="btn-block" onClick={()=>block(u.id)}>Block</button>
                </div>
              </div>
            ))
          }
        </div>

        {blocked.length > 0 && (
          <div>
            <div className="section-title">
              <span className="dot" style={{background:"#E24B4A"}}/>
              Blocked ({blocked.length})
            </div>
            {blocked.map(u => (
              <div key={u.id} className="card" style={{opacity:.6}}>
                <div className="avatar" style={{background:"#fcebeb",color:"#A32D2D"}}>{u.full_name?.[0]?.toUpperCase()||"?"}</div>
                <div>
                  <div className="user-name">{u.full_name||"Unknown"}</div>
                  <div className="user-email">{u.email}</div>
                </div>
                <div className="actions">
                  <button className="btn-approve" onClick={()=>approve(u.id)}>Restore</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
