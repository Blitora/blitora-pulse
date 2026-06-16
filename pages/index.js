import { useEffect } from "react";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: profile } = await sb
        .from("profiles")
        .select("role, status")
        .eq("id", session.user.id)
        .single();

      if (!profile || profile.status === "pending") { router.push("/pending"); return; }
      if (profile.role === "admin") { router.push("/admin"); return; }
      router.push("/dashboard");
    }
    redirect();
  }, []);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f0f0f7;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .spinner{width:36px;height:36px;border:3px solid #e5e3ee;border-top-color:#714B67;border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="spinner"/>
    </>
  );
}
