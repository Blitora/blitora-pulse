// pages/log.js — Daily Log tab (Water, Activity, Weight, Blood Pressure, Sugar)
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";
import RoleGuard from "../components/RoleGuard";
import { useRole, ROLES } from "../lib/useRole";

const G="#1D9E75",GL="#e1f5ee",N="#0D1B3E",A="#EF9F27",R="#E24B4A",BL="#2B6CB0";
const BORDER="#E0E3ED",TXT="#0D1B3E",TXT2="#718096",BG="#F5F6FA",CARD="#fff";

const fmt = d => d.toISOString().split("T")[0];
const today = () => fmt(new Date());

function Section({ icon, title, children }) {
  return (
    <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: "16px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: TXT, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

export default function LogPage() {
  const router = useRouter();
  const { role } = useRole();
  const [profile, setProfile] = useState(null);
  const [glasses, setGlasses] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [walks, setWalks] = useState({ morning: 0, afternoon: 0, evening: 0 });
  const [weight, setWeight] = useState("");
  const [bp, setBp] = useState({ systolic: "", diastolic: "" });
  const [sugar, setSugar] = useState({ fasting: "", postMeal: "" });
  const [saved, setSaved] = useState({});
  const [dateKey] = useState(today());

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
      if (p) { setProfile(p); setWaterGoal(p.daily_water_glasses || 8); }
      const { data: log } = await sb.from("health_logs").select("*").eq("user_id", session.user.id).eq("log_date", dateKey).maybeSingle();
      if (log) {
        setGlasses(log.total_water_glasses || 0);
        setWalks({ morning: log.walk_morning || 0, afternoon: log.walk_afternoon || 0, evening: log.walk_evening || 0 });
        if (log.weight_kg) setWeight(String(log.weight_kg));
        if (log.bp_systolic) setBp({ systolic: String(log.bp_systolic), diastolic: String(log.bp_diastolic || "") });
        if (log.sugar_fasting) setSugar({ fasting: String(log.sugar_fasting), postMeal: String(log.sugar_post_meal || "") });
      }
    }
    load();
  }, []);

  async function saveField(field, value) {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    await sb.from("health_logs").upsert({
      user_id: session.user.id, log_date: dateKey, [field]: value
    }, { onConflict: "user_id,log_date" });
    setSaved(s => ({ ...s, [field]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [field]: false })), 1500);
  }

  async function saveWater(g) {
    setGlasses(g);
    await saveField("total_water_glasses", g);
  }

  async function saveWalk(slot, mins) {
    const newWalks = { ...walks, [slot]: mins };
    setWalks(newWalks);
    await saveField(`walk_${slot}`, mins);
  }

  async function saveWeight() {
    if (!weight) return;
    await saveField("weight_kg", parseFloat(weight));
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await sb.from("weight_logs").upsert({ user_id: session.user.id, date: dateKey, weight_kg: parseFloat(weight) }, { onConflict: "user_id,date" });
    }
  }

  async function saveBP() {
    if (!bp.systolic) return;
    await saveField("bp_systolic", parseInt(bp.systolic));
    if (bp.diastolic) await saveField("bp_diastolic", parseInt(bp.diastolic));
  }

  async function saveSugar() {
    if (!sugar.fasting && !sugar.postMeal) return;
    if (sugar.fasting) await saveField("sugar_fasting", parseFloat(sugar.fasting));
    if (sugar.postMeal) await saveField("sugar_post_meal", parseFloat(sugar.postMeal));
  }

  const walkSlots = [
    { key: "morning", icon: "☀️", label: "Morning walk", targets: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 60] },
    { key: "afternoon", icon: "🌤️", label: "Post-lunch walk", targets: [0, 5, 10, 15, 20, 25, 30] },
    { key: "evening", icon: "🌙", label: "Post-dinner walk", targets: [0, 5, 10, 15, 20, 25, 30] },
  ];

  const inputStyle = { border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Poppins',Arial,sans-serif", color: TXT, outline: "none", background: BG, width: "100%", boxSizing: "border-box" };
  const saveBtn = (fn, field) => (
    <button onClick={fn} style={{ padding: "9px 18px", background: G, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Poppins',Arial,sans-serif", cursor: "pointer", flexShrink: 0 }}>
      {saved[field] ? "✓ Saved" : "Save"}
    </button>
  );

  return (
    <>
      <Head><title>Log — Blitora Pulse</title></Head>
      <RoleGuard allow={[ROLES.PATIENT, ROLES.UNASSIGNED]}>
        <Layout>
          <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>

            {/* ── WATER ── */}
            <Section icon="💧" title="Water intake">
              {/* Glass size reference */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EBF8FF", borderRadius: 10, padding: "8px 12px", marginBottom: 14, border: "1px solid #BEE3F8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🥛</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: BL }}>1 glass = 250 ml</div>
                    <div style={{ fontSize: 10, color: TXT2 }}>Standard drinking glass · ~8 fl oz</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: BL }}>{glasses * 250} ml</div>
                  <div style={{ fontSize: 10, color: TXT2 }}>consumed today</div>
                </div>
              </div>
              {/* Glass tap grid */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {Array.from({ length: waterGoal }, (_, i) => (
                  <div key={i} onClick={() => saveWater(i < glasses ? i : i + 1)}
                    style={{ width: 40, height: 48, borderRadius: 10, border: `2px solid ${i < glasses ? BL : BORDER}`, background: i < glasses ? "#EBF8FF" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 2, transition: "all .15s" }}>
                    <span style={{ fontSize: i < glasses ? 18 : 16, opacity: i < glasses ? 1 : 0.35 }}>💧</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: i < glasses ? BL : TXT2 }}>{(i+1)*250}ml</span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: BORDER, borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (glasses / waterGoal) * 100)}%`, background: BL, borderRadius: 6, transition: "width .3s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TXT2 }}>
                <span>{glasses} of {waterGoal} glasses ({glasses * 250}ml of {waterGoal * 250}ml)</span>
                <span style={{ color: glasses >= waterGoal ? G : TXT2, fontWeight: glasses >= waterGoal ? 700 : 400 }}>
                  {glasses >= waterGoal ? "✓ Goal reached!" : `${Math.max(0, waterGoal - glasses)} glasses to go`}
                </span>
              </div>
            </Section>

            {/* ── WALKS ── */}
            <Section icon="🚶" title="Activity">
              {walkSlots.map(sl => (
                <div key={sl.key} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TXT }}>{sl.icon} {sl.label}</span>
                    <span style={{ fontSize: 12, color: TXT2 }}>{walks[sl.key]}min / {sl.targets[sl.targets.length - 1]}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {sl.targets.map(t => (
                      <button key={t} onClick={() => saveWalk(sl.key, t)} style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${walks[sl.key] === t ? G : BORDER}`, background: walks[sl.key] === t ? GL : "#fff", color: walks[sl.key] === t ? G : TXT2, fontSize: 12, fontWeight: walks[sl.key] === t ? 700 : 400, cursor: "pointer", fontFamily: "'Poppins',Arial,sans-serif" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            {/* ── WEIGHT ── */}
            <Section icon="⚖️" title="Weight — today">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 74.5" style={{ ...inputStyle, flex: 1 }} />
                <span style={{ fontSize: 13, color: TXT2, flexShrink: 0 }}>kg</span>
                {saveBtn(saveWeight, "weight_kg")}
              </div>
              {saved.weight_kg && <div style={{ fontSize: 11, color: G, marginTop: 6 }}>✓ Weight logged</div>}
            </Section>

            {/* ── BLOOD PRESSURE ── */}
            <Section icon="🩺" title="Blood pressure">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: TXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>SYSTOLIC (mmHg)</label>
                  <input type="number" value={bp.systolic} onChange={e => setBp(b => ({ ...b, systolic: e.target.value }))} placeholder="e.g. 120" style={inputStyle} />
                </div>
                <div style={{ fontSize: 20, color: TXT2, marginTop: 18 }}>/</div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: TXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>DIASTOLIC (mmHg)</label>
                  <input type="number" value={bp.diastolic} onChange={e => setBp(b => ({ ...b, diastolic: e.target.value }))} placeholder="e.g. 80" style={inputStyle} />
                </div>
                {saveBtn(saveBP, "bp_systolic")}
              </div>
              {bp.systolic && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: parseInt(bp.systolic) > 140 ? "#fef2f2" : GL, borderRadius: 10, fontSize: 12, color: parseInt(bp.systolic) > 140 ? R : G }}>
                  {parseInt(bp.systolic) > 140 ? "⚠️ High BP detected. Please consult your doctor." : parseInt(bp.systolic) < 90 ? "⚠️ Low BP detected." : "✓ BP looks normal"}
                </div>
              )}
            </Section>

            {/* ── BLOOD SUGAR ── */}
            <Section icon="🩸" title="Blood sugar (mg/dL)">
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: TXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>FASTING</label>
                  <input type="number" value={sugar.fasting} onChange={e => setSugar(s => ({ ...s, fasting: e.target.value }))} placeholder="e.g. 95" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: TXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>POST-MEAL (2hr)</label>
                  <input type="number" value={sugar.postMeal} onChange={e => setSugar(s => ({ ...s, postMeal: e.target.value }))} placeholder="e.g. 140" style={inputStyle} />
                </div>
              </div>
              {saveBtn(saveSugar, "sugar_fasting")}
              {sugar.fasting && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: parseInt(sugar.fasting) > 126 ? "#fef2f2" : GL, borderRadius: 10, fontSize: 12, color: parseInt(sugar.fasting) > 126 ? R : G }}>
                  {parseInt(sugar.fasting) > 126 ? "⚠️ Fasting sugar is high. Log consistently for AI trend tracking." : parseInt(sugar.fasting) < 70 ? "⚠️ Fasting sugar is low." : "✓ Fasting sugar in healthy range"}
                </div>
              )}
            </Section>

          </div>
        </Layout>
      </RoleGuard>
    </>
  );
}
