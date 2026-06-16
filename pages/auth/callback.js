import { useEffect } from "react";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";

async function routeUser(sb, session, router) {
  const { data: profile } = await sb
    .from("profiles")
    .select("role, status")
    .eq("id", session.user.id)
    .single();

  if (!profile) { router.push("/login"); return; }
  if (profile.status === "pending") { router.push("/pending"); return; }
  if (profile.role === "admin") { router.push("/admin"); return; }
  router.push("/dashboard");
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const sb = getSupabase();

      const { data: { session }, error } = await sb.auth.getSession();

      if (!session) {
        const { data: listenData } = sb.auth.onAuthStateChange(async (event, newSession) => {
          if (event === "SIGNED_IN" && newSession) {
            listenData.subscription.unsubscribe();
            await routeUser(sb, newSession, router);
          }
        });
        setTimeout(() => {
          sb.auth.getSession().then(({ data: { session: s } }) => {
            if (s) routeUser(sb, s, router);
            else router.push("/login");
          });
        }, 2000);
        return;
      }

      await routeUser(sb, session, router);
    }
    handleCallback();
  }, []);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f0f0f7;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .wrap{text-align:center}
        .spinner{width:36px;height:36px;border:3px solid #e5e3ee;border-top-color:#714B67;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px}
        .text{font-size:14px;color:#888}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="wrap">
        <div className="spinner"/>
        <div className="text">Signing you in…</div>
      </div>
    </>
  );
}
