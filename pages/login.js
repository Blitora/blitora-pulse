import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  

  async function handleEmail(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const sb = getSupabase();

    try {
      if (mode === "login") {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); setLoading(false); return; }
        const { data: profile, error: pErr } = await sb.from("profiles").select("role,status").eq("id", data.user.id).single();
        if (pErr) { setError("Profile error: " + pErr.message); setLoading(false); return; }
        if (profile?.status === "pending") { router.push("/pending"); return; }
        if (profile?.role === "admin") { router.push("/admin"); return; }
        router.push("/dashboard");
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        });
        if (error) { setError(error.message); setLoading(false); return; }
        if (data?.user && !data?.session) {
          setMessage("Check your email to confirm your account. Once confirmed, your account will be reviewed.");
        } else if (data?.user && data?.session) {
          router.push("/pending");
        }
      }
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        }
      });
      if (error) { setError(error.message); setLoading(false); }
    } catch (err) {
      setError("Google error: " + err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>{mode === "login" ? "Sign in" : "Create account"} — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f0f0f7;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .wrap{width:100%;max-width:420px;padding:24px 16px}
        .logo{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:32px}
        .logo-mark{width:40px;height:40px;background:#714B67;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700}
        .logo-text{font-size:20px;font-weight:700;color:#2c1a3a}
        .logo-sub{font-size:12px;color:#888;font-weight:400}
        .card{background:#fff;border-radius:16px;border:1px solid #e5e3ee;padding:32px}
        .title{font-size:18px;font-weight:700;color:#2c1a3a;margin-bottom:4px}
        .sub{font-size:13px;color:#888;margin-bottom:24px}
        .label{display:block;font-size:12px;font-weight:600;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
        .input{width:100%;padding:10px 14px;border:1px solid #e5e3ee;border-radius:8px;font-size:14px;color:#2c1a3a;outline:none;transition:border-color .2s;background:#fff}
        .input:focus{border-color:#714B67}
        .input-wrap{margin-bottom:16px}
        .btn-primary{width:100%;padding:11px;background:#714B67;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s;margin-top:4px}
        .btn-primary:hover{background:#5a3a53}
        .btn-primary:disabled{background:#b8a0b0;cursor:not-allowed}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#ccc;font-size:12px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#e5e3ee}
        .btn-google{width:100%;padding:10px;background:#fff;border:1.5px solid #e5e3ee;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;color:#2c1a3a;transition:border-color .2s}
        .btn-google:hover{border-color:#714B67}
        .toggle{text-align:center;margin-top:20px;font-size:13px;color:#888}
        .toggle a{color:#714B67;font-weight:600;cursor:pointer}
        .error{background:#fff0f0;border:1px solid #ffd0d0;color:#c0392b;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
        .success{background:#f0faf5;border:1px solid #b7e4cc;color:#1a7a4a;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
        .dbg{background:#f0f0f7;border:1px solid #e5e3ee;border-radius:8px;padding:8px 12px;font-size:11px;color:#666;margin-bottom:12px;word-break:break-all}
        .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;margin-right:8px;vertical-align:middle}
        @keyframes spin{to{transform:rotate(360deg)}}
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
          <div className="title">{mode === "login" ? "Welcome back" : "Create your account"}</div>
          <div className="sub">{mode === "login" ? "Sign in to your health dashboard" : "Request access to start tracking"}</div>

          {debug && <div className="dbg">{debug}</div>}
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          {!message && (
            <>
              <form onSubmit={handleEmail}>
                {mode === "signup" && (
                  <div className="input-wrap">
                    <label className="label">Full name</label>
                    <input className="input" type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required/>
                  </div>
                )}
                <div className="input-wrap">
                  <label className="label">Email address</label>
                  <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
                </div>
                <div className="input-wrap">
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading && <span className="spinner"/>}
                  {mode === "login" ? "Sign in" : "Request access"}
                </button>
              </form>

              <div className="divider">or</div>

              <button className="btn-google" onClick={handleGoogle} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>

        <div className="toggle">
          {mode === "login"
            ? <>Don't have an account? <a onClick={()=>{setMode("signup");setError(null);setMessage(null);}}>Request access</a></>
            : <>Already have an account? <a onClick={()=>{setMode("login");setError(null);setMessage(null);}}>Sign in</a></>
          }
        </div>
      </div>
    </>
  );
}
