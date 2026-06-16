import Head from "next/head";
import { getSupabase } from "../lib/supabase";

export default function Pending() {
  async function handleSignOut() {
    await getSupabase().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <Head><title>Awaiting Approval — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f0f0f7;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .wrap{width:100%;max-width:420px;padding:24px 16px;text-align:center}
        .logo{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:32px}
        .logo-mark{width:40px;height:40px;background:#714B67;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700}
        .logo-text{font-size:20px;font-weight:700;color:#2c1a3a;text-align:left}
        .logo-sub{font-size:12px;color:#888;font-weight:400}
        .card{background:#fff;border-radius:16px;border:1px solid #e5e3ee;padding:40px 32px}
        .icon{width:64px;height:64px;background:#faeeda;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px}
        .title{font-size:18px;font-weight:700;color:#2c1a3a;margin-bottom:8px}
        .desc{font-size:13px;color:#888;line-height:1.6;margin-bottom:24px}
        .steps{background:#f8f7fc;border-radius:10px;padding:16px;margin-bottom:24px;text-align:left}
        .step{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
        .step:last-child{margin-bottom:0}
        .step-num{width:20px;height:20px;background:#714B67;border-radius:50%;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .step-text{font-size:12px;color:#555;line-height:1.5}
        .btn-out{width:100%;padding:10px;background:#fff;border:1px solid #e5e3ee;border-radius:8px;font-size:13px;font-weight:500;color:#888;cursor:pointer;transition:border-color .2s}
        .btn-out:hover{border-color:#714B67;color:#714B67}
        .badge{display:inline-flex;align-items:center;gap:6px;background:#faeeda;color:#854F0B;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:600;margin-bottom:20px}
        .dot{width:7px;height:7px;background:#EF9F27;border-radius:50%;animation:pulse 1.5s infinite;display:inline-block}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      <div className="wrap">
        <div className="logo">
          <div className="logo-mark">H</div>
          <div>
            <div className="logo-text">Health Tracker</div>
            <div className="logo-sub">by Azeem</div>
          </div>
        </div>
        <div className="card">
          <div className="icon">⏳</div>
          <div className="badge"><span className="dot"/> Pending approval</div>
          <div className="title">You're on the waitlist</div>
          <div className="desc">Your account has been created and is awaiting approval from the admin. You'll get access as soon as it's reviewed.</div>
          <div className="steps">
            <div className="step"><div className="step-num">1</div><div className="step-text">You signed up and confirmed your email</div></div>
            <div className="step"><div className="step-num">2</div><div className="step-text">Admin reviews and approves your account <span style={{color:"#EF9F27",fontWeight:600}}>← you are here</span></div></div>
            <div className="step"><div className="step-num">3</div><div className="step-text">You get full access to your health dashboard</div></div>
          </div>
          <button className="btn-out" onClick={handleSignOut}>Sign out and come back later</button>
        </div>
      </div>
    </>
  );
}
