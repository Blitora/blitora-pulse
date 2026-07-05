import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabase } from '../lib/supabase';

/* ==========================================================
   Blitora Pulse — marketing landing page (v10 — gravity playground returns with Magnet mode (chips chase cursor))
   - Real pricing pulled from live site (as-of deploy day)
   - Session check: logged-in users → /dashboard
   - Reuses existing /api/lead-capture + /public brochures
   ========================================================== */

const CSS = `
:root{
  --bg:#060D22; --bg2:#08122E; --panel:#0B1533; --panel2:#101C42;
  --light:#F4F7FF; --light2:#EBF0FF; --light-panel:#FFFFFF; --light-border:rgba(13,27,62,.1);
  --line:rgba(139,155,191,.16); --line2:rgba(43,217,159,.35);
  --green:#2BD99F; --green-d:#1D9E75; --violet:#8B5CF6; --blue:#3EA6FF;
  --amber:#F5B544; --red:#F4645F;
  --text:#EAF2FF; --text-dark:#0D1B3E; --muted:#8B9BBF; --muted2:#5E6E96;
  --font:'Poppins',Arial,sans-serif; --mono:'IBM Plex Mono',monospace;
  --rad:18px; --wa:#25D366;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font);overflow-x:hidden;line-height:1.6}
::selection{background:var(--green);color:#04240F}
a{color:inherit;text-decoration:none}
button{font-family:var(--font);cursor:pointer;border:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
section{position:relative;padding:110px 0}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--green);display:inline-flex;align-items:center;gap:10px;margin-bottom:18px}
.eyebrow::before{content:"";width:26px;height:2px;background:linear-gradient(90deg,var(--green),transparent)}
h2.sec{font-size:clamp(30px,4.4vw,48px);font-weight:800;line-height:1.15;letter-spacing:-.01em;margin-bottom:14px}
.sec .g{background:linear-gradient(92deg,var(--green),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--muted);font-size:17px;max-width:640px}
.grain{position:fixed;inset:0;pointer-events:none;opacity:.05;z-index:1;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")}
.skip{position:absolute;left:-9999px;top:8px;padding:10px 16px;background:var(--green);color:#03200F;font-weight:700;border-radius:8px;z-index:999}
.skip:focus{left:8px;outline:2px solid #fff;outline-offset:2px}
:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:6px}
.btn:focus-visible{outline-offset:4px}

/* NAV */
nav.mainnav{position:fixed;top:0;left:0;right:0;z-index:90;transition:.35s;padding:18px 0}
nav.mainnav.scrolled{background:rgba(6,13,34,.82);backdrop-filter:blur(18px);border-bottom:1px solid var(--line);padding:11px 0}
.nav-in{display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:12px}
.logo-mark{width:42px;height:42px;border-radius:11px;background:linear-gradient(145deg,#0E1B44,#091230);border:1px solid var(--line2);display:grid;place-items:center;position:relative;box-shadow:0 0 22px rgba(43,217,159,.25)}
.logo-mark svg{width:26px;height:26px}
.logo-word{font-weight:800;font-size:17px;letter-spacing:.04em}
.logo-word em{font-style:normal;color:var(--green)}
.logo-tag{display:block;font-family:var(--mono);font-size:9px;letter-spacing:.18em;color:var(--muted2);text-transform:uppercase}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{font-size:14px;font-weight:500;color:var(--muted);transition:.25s;position:relative}
.nav-links a:hover{color:var(--text)}
.nav-links a::after{content:"";position:absolute;left:0;bottom:-5px;width:0;height:2px;background:var(--green);transition:.3s}
.nav-links a:hover::after{width:100%}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;border-radius:14px;font-weight:600;font-size:15px;position:relative;transition:transform .18s cubic-bezier(.2,.9,.3,1.4),box-shadow .25s;will-change:transform;text-align:center;justify-content:center}
.btn-g{background:linear-gradient(120deg,var(--green),#1FBE8B);color:#03200F;box-shadow:0 6px 26px rgba(43,217,159,.35)}
.btn-g:hover{box-shadow:0 10px 38px rgba(43,217,159,.55)}
.btn-o{background:transparent;color:var(--text);border:1px solid var(--line);backdrop-filter:blur(6px)}
.btn-o:hover{border-color:var(--green);color:var(--green)}
.btn-v{background:linear-gradient(120deg,var(--violet),#6D3EE8);color:#fff;box-shadow:0 6px 26px rgba(139,92,246,.35)}
.btn-sm{padding:10px 20px;font-size:13.5px;border-radius:11px}
.burger{display:none;background:none;color:var(--text);font-size:26px}

/* HERO */
.hero{min-height:100vh;display:flex;align-items:center;padding:150px 0 90px;overflow:hidden}
#field{position:absolute;inset:0;z-index:0}
.hero-glow{position:absolute;width:640px;height:640px;border-radius:50%;filter:blur(140px);opacity:.22;pointer-events:none}
.hg1{background:var(--green);top:-180px;right:-120px}
.hg2{background:var(--violet);bottom:-240px;left:-160px}
.heroline{position:absolute;left:0;right:0;top:52%;height:120px;transform:translateY(-50%);pointer-events:none;z-index:0;opacity:.45;filter:drop-shadow(0 0 8px rgba(43,217,159,.35))}
.heroline svg{width:100%;height:100%}
.hl-path{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2900;stroke-dashoffset:2900;animation:hldraw 8s linear infinite}
@keyframes hldraw{0%{stroke-dashoffset:2900}72%{stroke-dashoffset:0}100%{stroke-dashoffset:0}}
.hero-in{position:relative;z-index:3;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;width:100%}
.pill{display:inline-flex;align-items:center;gap:9px;padding:8px 16px;border-radius:100px;border:1px solid var(--line2);background:rgba(43,217,159,.07);font-family:var(--mono);font-size:12px;color:var(--green);margin-bottom:26px}
.pill .dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:blink 1.6s infinite}
@keyframes blink{50%{opacity:.25}}
h1{font-size:clamp(38px,5.6vw,66px);font-weight:800;line-height:1.08;letter-spacing:-.02em;margin-bottom:24px}
h1 .grad{background:linear-gradient(92deg,var(--green) 10%,var(--violet) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-sub{color:var(--muted);font-size:18px;max-width:520px;margin-bottom:34px}
.hero-ctas{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:38px}
.time-badges{display:flex;gap:12px;flex-wrap:wrap}
.tb{padding:12px 18px;border-radius:14px;background:rgba(11,21,51,.7);border:1px solid var(--line);backdrop-filter:blur(8px);position:relative;overflow:hidden}
.tb b{display:block;font-family:var(--mono);font-size:17px;color:var(--green)}
.tb span{font-size:11.5px;color:var(--muted)}

/* Hero phone */
.hero-phone{position:relative;display:flex;justify-content:center;perspective:1200px}
.phone-halo{position:absolute;inset:-24px;border-radius:56px;pointer-events:none;background:radial-gradient(ellipse at center,rgba(43,217,159,.22),transparent 62%);opacity:.4;animation:heartbeat 1.1s ease-in-out infinite;z-index:0}
@keyframes heartbeat{0%,100%{transform:scale(1);opacity:.35}18%{transform:scale(1.045);opacity:.7}30%{transform:scale(1);opacity:.35}45%{transform:scale(1.055);opacity:.75}60%{transform:scale(1);opacity:.35}}
.phone{width:300px;border-radius:42px;background:linear-gradient(160deg,#111D45,#0A1330);border:1px solid rgba(139,155,191,.28);padding:14px;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 70px rgba(43,217,159,.14);transform:rotateY(-14deg) rotateX(6deg);transition:transform .4s ease;animation:float 7s ease-in-out infinite;position:relative;z-index:1}
@keyframes float{0%,100%{translate:0 0}50%{translate:0 -16px}}
.phone-scr{border-radius:30px;background:#070F2B;overflow:hidden;border:1px solid var(--line)}
.p-top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px;font-size:11px;color:var(--muted)}
.p-orb{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#B79BFF,var(--violet));box-shadow:0 0 14px rgba(139,92,246,.8);animation:orb 2.4s ease-in-out infinite}
@keyframes orb{50%{box-shadow:0 0 26px rgba(139,92,246,1)}}
.p-hi{padding:4px 16px 10px;font-weight:700;font-size:16px}
.p-hi span{color:var(--green)}
.p-card{margin:0 12px 10px;padding:12px 14px;border-radius:14px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.35)}
.p-card .lab{font-family:var(--mono);font-size:9px;letter-spacing:.18em;color:var(--violet);text-transform:uppercase;margin-bottom:5px;display:flex;align-items:center;gap:6px}
.p-card p{font-size:11.5px;color:#CFDAF5;line-height:1.5}
.p-card p b{color:var(--green)}
.p-rings{display:flex;justify-content:space-around;padding:6px 10px 12px}
.ring{width:58px;text-align:center}
.ring svg{width:52px;height:52px;transform:rotate(-90deg)}
.ring .rl{font-size:9px;color:var(--muted);display:block;margin-top:3px}
.ring .rv{font-family:var(--mono);font-size:10px;color:var(--text)}
.p-row{display:flex;gap:8px;padding:0 12px 16px}
.p-mini{flex:1;padding:10px;border-radius:12px;background:var(--panel);border:1px solid var(--line);text-align:center}
.p-mini b{display:block;font-family:var(--mono);font-size:14px;color:var(--green)}
.p-mini span{font-size:9px;color:var(--muted)}
.notif{position:absolute;padding:12px 16px;border-radius:14px;background:rgba(11,21,51,.92);border:1px solid var(--line2);backdrop-filter:blur(10px);font-size:11.5px;max-width:230px;box-shadow:0 16px 40px rgba(0,0,0,.5);animation:float 6s ease-in-out infinite;z-index:2}
.notif b{color:var(--green)}
.n1{top:6%;left:-8%;animation-delay:-2s}
.n2{bottom:10%;right:-6%;animation-delay:-4s}
.n2 b{color:var(--violet)}
.scroll-cue{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);z-index:3;font-family:var(--mono);font-size:10px;letter-spacing:.3em;color:var(--muted2);text-transform:uppercase;animation:cue 2.2s infinite}
@keyframes cue{50%{transform:translate(-50%,8px);opacity:.4}}

/* SECTION ECG DIVIDER */
.ecg-div{position:absolute;top:0;left:0;right:0;height:60px;pointer-events:none;overflow:hidden}
.ecg-div svg{width:100%;height:100%;display:block}
.ecg-path{fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1600;stroke-dashoffset:1600;transition:stroke-dashoffset 1.6s cubic-bezier(.4,.1,.2,1)}
.reveal.in .ecg-path{stroke-dashoffset:0}

/* TIME STORY */
.story{background:linear-gradient(180deg,var(--light),var(--light2))}
.story .eyebrow{color:var(--green-d)}
.story h2.sec{color:var(--text-dark)}
.story .sub{color:#3D4F70}
.story .tcap{color:#3D4F70}
.story .tcap b{color:var(--green-d)}
.story .tphase{color:#5E6E96;border-color:rgba(13,27,62,.15);background:rgba(13,27,62,.04)}
.story .tstep{background:linear-gradient(165deg,rgba(255,255,255,.95),rgba(235,240,255,.9));border:1px solid rgba(13,27,62,.12);box-shadow:0 8px 32px rgba(13,27,62,.08)}
.story .tstep:hover{border-color:rgba(43,217,159,.5);box-shadow:0 20px 50px rgba(43,217,159,.15)}
.story .tstep .node{background:var(--light);border-color:var(--green-d)}
.story .tstep .node i{background:var(--green-d)}
.story .tstep h3{color:var(--text-dark)}
.story .tstep p{color:#4A5E80}
.tline{position:relative;margin-top:70px}
.pulse-track{position:absolute;left:3%;right:3%;top:0;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(43,217,159,0),var(--green) 18%,var(--blue) 50%,var(--violet) 82%,rgba(139,92,246,0));transform:scaleX(0);transform-origin:left;transition:transform 1.3s cubic-bezier(.2,.8,.2,1) .15s;box-shadow:0 0 18px rgba(62,166,255,.35)}
.reveal.in .pulse-track{transform:scaleX(1)}
.pulse-dot{position:absolute;top:50%;left:0;width:11px;height:11px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);animation:travel 4.6s ease-in-out infinite;box-shadow:0 0 20px 7px rgba(43,217,159,.7)}
@keyframes travel{0%{left:2%;box-shadow:0 0 20px 7px rgba(43,217,159,.75)}50%{left:50%;box-shadow:0 0 20px 7px rgba(62,166,255,.75)}100%{left:98%;box-shadow:0 0 20px 7px rgba(139,92,246,.75)}}
.tsteps{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding-top:44px}
.tstep{position:relative;text-align:center;padding:44px 26px 32px;border-radius:22px;background:linear-gradient(165deg,rgba(17,29,69,.88),rgba(8,15,40,.92));border:1px solid var(--line);transition:border-color .3s,box-shadow .3s,transform .3s cubic-bezier(.2,.8,.3,1);overflow:hidden}
.tstep::after{content:"";position:absolute;inset:0;border-radius:22px;background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(43,217,159,.09),transparent);pointer-events:none;opacity:0;transition:.35s}
.tstep:hover{border-color:rgba(43,217,159,.45);box-shadow:0 26px 60px rgba(0,0,0,.5),0 0 46px rgba(43,217,159,.1)}
.tstep:hover::after{opacity:1}
.tstep:nth-child(2):hover{border-color:rgba(62,166,255,.45)}
.tstep:nth-child(3):hover{border-color:rgba(139,92,246,.45)}
.tstep .node{position:absolute;top:-59px;left:50%;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;background:var(--bg);border:2px solid var(--green);display:grid;place-items:center;box-shadow:0 0 22px rgba(43,217,159,.55)}
.tstep .node i{width:10px;height:10px;border-radius:50%;background:var(--green);animation:blink 2s infinite}
.tstep:nth-child(2) .node{border-color:var(--blue);box-shadow:0 0 22px rgba(62,166,255,.55)}
.tstep:nth-child(2) .node i{background:var(--blue)}
.tstep:nth-child(3) .node{border-color:var(--violet);box-shadow:0 0 22px rgba(139,92,246,.55)}
.tstep:nth-child(3) .node i{background:var(--violet)}
.tphase{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);padding:6px 15px;border-radius:100px;margin-bottom:18px;background:rgba(255,255,255,.02)}
.tbig{font-family:var(--mono);font-size:clamp(38px,4.8vw,56px);font-weight:600;background:linear-gradient(120deg,#fff 20%,var(--green));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(43,217,159,.3))}
.tstep:nth-child(2) .tbig{background:linear-gradient(120deg,#fff 20%,var(--blue));-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 22px rgba(62,166,255,.3))}
.tstep:nth-child(3) .tbig{background:linear-gradient(120deg,#fff 20%,var(--violet));-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 22px rgba(139,92,246,.3))}
.tbig small{font-size:.42em}
.tstep h3{font-size:18px;font-weight:700;margin:12px 0 9px}
.tstep p{font-size:14px;color:var(--muted);max-width:300px;margin:0 auto}
.tcap{text-align:center;margin-top:54px;font-size:19px;color:var(--muted)}
.tcap b{color:var(--green)}

/* AI DEMO */
.ai-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:44px;margin-top:56px;align-items:start}
.card{background:linear-gradient(160deg,var(--panel),#0A1230);border:1px solid var(--line);border-radius:22px;padding:30px;position:relative;overflow:hidden}
.f-label{font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);display:block;margin:16px 0 8px}
.opts{display:flex;flex-wrap:wrap;gap:9px}
.opt{padding:9px 16px;border-radius:100px;border:1px solid var(--line);background:rgba(255,255,255,.02);color:var(--muted);font-size:13px;font-weight:500;transition:.2s}
.opt:hover{border-color:var(--green);color:var(--text)}
.opt.on{background:rgba(43,217,159,.14);border-color:var(--green);color:var(--green)}
.opt:focus-visible{border-color:var(--green);color:var(--text);background:rgba(43,217,159,.08)}
.gen-btn{width:100%;margin-top:26px}
.plan-out{min-height:420px}
.plan-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.plan-head h4{font-size:16px}
.plan-head .tag{font-family:var(--mono);font-size:10px;color:var(--violet);border:1px solid rgba(139,92,246,.4);border-radius:100px;padding:4px 12px}
.meal-row{display:flex;justify-content:space-between;gap:12px;padding:13px 14px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid var(--line);margin-bottom:9px;opacity:0;transform:translateY(12px);transition:.5s}
.meal-row.show{opacity:1;transform:none}
.meal-row .mt{font-family:var(--mono);font-size:10px;color:var(--green);letter-spacing:.1em;text-transform:uppercase;min-width:82px;padding-top:2px}
.meal-row .mf{flex:1;font-size:13.5px;color:#D6E1F8}
.meal-row .mk{font-family:var(--mono);font-size:11px;color:var(--muted);white-space:nowrap}
.mf .cursor{display:inline-block;width:7px;height:14px;background:var(--green);vertical-align:-2px;margin-left:2px;animation:tk 1s infinite}
@keyframes tk{50%{opacity:0}}
.plan-tot{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.ptot{flex:1;min-width:80px;text-align:center;padding:12px 6px;border-radius:12px;background:rgba(43,217,159,.07);border:1px solid rgba(43,217,159,.25)}
.ptot b{display:block;font-family:var(--mono);font-size:15px;color:var(--green)}
.ptot span{font-size:10px;color:var(--muted)}
.thinking{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:14px;padding:30px 0}
.tdots{display:flex;gap:5px}
.tdots i{width:8px;height:8px;border-radius:50%;background:var(--violet);animation:td 1.1s infinite}
.tdots i:nth-child(2){animation-delay:.15s}.tdots i:nth-child(3){animation-delay:.3s}
@keyframes td{40%{transform:translateY(-7px);opacity:.5}}
.nudges{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:70px}
.nudge{padding:22px;border-radius:18px;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--green);font-size:14px;color:#CFDAF5;transition:.3s;position:relative;overflow:hidden}
.nudge:hover{border-left-color:var(--violet);box-shadow:0 16px 40px rgba(0,0,0,.4)}
.nudge .nl{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--green);display:block;margin-bottom:9px}
.nudge .nl::after{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-left:8px;box-shadow:0 0 8px var(--green);animation:blink 1.6s infinite;vertical-align:1px}
.nudge b{color:var(--green)}

/* 3D DASHBOARDS */
.dash-sec{background:radial-gradient(ellipse 70% 60% at 50% 0%,rgba(139,92,246,.09),transparent),var(--bg2)}
.stage{perspective:1600px;margin-top:64px;display:flex;justify-content:center}
.holo{position:relative;width:min(860px,100%);transform-style:preserve-3d;transform:rotateX(14deg) rotateY(-6deg);transition:transform .25s ease-out}
.dash{background:linear-gradient(165deg,rgba(17,29,69,.95),rgba(8,15,40,.95));border:1px solid rgba(139,155,191,.25);border-radius:22px;padding:24px;box-shadow:0 60px 120px rgba(0,0,0,.65),0 0 90px rgba(43,217,159,.12);transform:translateZ(0)}
.dash-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:8px}
.dash-top .dt{font-weight:700;font-size:15px}
.dash-top .dd{font-family:var(--mono);font-size:11px;color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.kpi{padding:15px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);transform:translateZ(30px)}
.kpi .kv{font-family:var(--mono);font-size:21px;font-weight:600}
.kpi .kv.g{color:var(--green)}.kpi .kv.b{color:var(--blue)}.kpi .kv.a{color:var(--amber)}.kpi .kv.v{color:var(--violet)}
.kpi .kl{font-size:10.5px;color:var(--muted)}
.kpi .ks{font-family:var(--mono);font-size:9.5px;color:var(--green)}
.dash-mid{display:grid;grid-template-columns:1.5fr 1fr;gap:12px}
.chart-card{padding:16px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);transform:translateZ(46px)}
.chart-card .cl{font-size:11px;color:var(--muted);margin-bottom:8px;display:flex;justify-content:space-between}
.chart-card .cl b{color:var(--text);font-size:12px}
.bars{display:flex;align-items:flex-end;gap:7px;height:110px}
.bar{flex:1;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,var(--green),rgba(43,217,159,.15));position:relative;animation:grow 1.4s cubic-bezier(.2,.9,.3,1.2) both;transform-origin:bottom;transition:transform .8s ease}
.bar:nth-child(even){background:linear-gradient(180deg,var(--violet),rgba(139,92,246,.15))}
@keyframes grow{from{height:0!important}}
.donut-wrap{display:flex;align-items:center;gap:14px}
.donut{width:104px;height:104px}
.dleg{font-size:11px;color:var(--muted);display:grid;gap:6px}
.dleg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:-1px}
.float-chip{position:absolute;padding:13px 17px;border-radius:14px;background:rgba(11,21,51,.94);border:1px solid var(--line2);backdrop-filter:blur(8px);font-size:12px;box-shadow:0 20px 50px rgba(0,0,0,.55)}
.fc1{top:-26px;right:-34px;transform:translateZ(90px)}
.fc2{bottom:-24px;left:-40px;transform:translateZ(110px);border-color:rgba(139,92,246,.5)}
.fc1 b{color:var(--green)}.fc2 b{color:var(--violet)}
.dash-hint{text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted2);margin-top:38px;letter-spacing:.15em}

/* FLIP CARDS */
.flip-sec{background:linear-gradient(180deg,var(--light2),var(--light))}
.flip-sec .eyebrow{color:var(--green-d)}
.flip-sec h2.sec{color:var(--text-dark)}
.flip-sec .sub{color:#3D4F70}
.flips{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:56px}
.flip{perspective:1100px;height:230px;position:relative}
.flip-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,.8,.3,1)}
.flip:hover .flip-in,.flip.tapped .flip-in{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;border-radius:20px;padding:26px;display:flex;flex-direction:column;justify-content:flex-end}
.face.front{border:1px solid var(--line);transition:border-color .3s}
.flip:nth-child(6n+1) .face.front{background:linear-gradient(145deg,#FFFFFF,#EDF5FF);border-color:rgba(43,217,159,.3)}
.flip:nth-child(6n+1) .face.front:hover{border-color:rgba(43,217,159,.6)}
.flip:nth-child(6n+2) .face.front{background:linear-gradient(145deg,#FFFFFF,#F3EEFF);border-color:rgba(139,92,246,.3)}
.flip:nth-child(6n+2) .face.front:hover{border-color:rgba(139,92,246,.6)}
.flip:nth-child(6n+3) .face.front{background:linear-gradient(145deg,#FFFFFF,#EDF5FF);border-color:rgba(43,217,159,.3)}
.flip:nth-child(6n+4) .face.front{background:linear-gradient(145deg,#FFFFFF,#F3EEFF);border-color:rgba(139,92,246,.3)}
.flip:nth-child(6n+5) .face.front{background:linear-gradient(145deg,#FFFFFF,#EDF5FF);border-color:rgba(43,217,159,.3)}
.flip:nth-child(6n+6) .face.front{background:linear-gradient(145deg,#FFFFFF,#F3EEFF);border-color:rgba(139,92,246,.3)}
.face.front .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;margin-bottom:auto;box-shadow:0 0 22px rgba(43,217,159,.2)}
.flip:nth-child(odd) .face.front .ic{background:linear-gradient(135deg,rgba(43,217,159,.2),rgba(43,217,159,.06));border:1px solid rgba(43,217,159,.4)}
.flip:nth-child(even) .face.front .ic{background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(139,92,246,.06));border:1px solid rgba(139,92,246,.4);box-shadow:0 0 22px rgba(139,92,246,.2)}
.face.front h3{font-size:17px;font-weight:700;margin-top:8px;color:var(--text-dark)}
.face.front span{font-family:var(--mono);font-size:10px;color:#8896B3;letter-spacing:.15em;text-transform:uppercase;margin-top:5px}
.face.back{transform:rotateY(180deg);justify-content:center;border:1px solid}
.flip:nth-child(odd) .face.back{background:linear-gradient(145deg,#0D2A20,#091830);border-color:rgba(43,217,159,.5)}
.flip:nth-child(even) .face.back{background:linear-gradient(145deg,#1E1245,#0B0A2A);border-color:rgba(139,92,246,.5)}
.face.back p{font-size:13.5px;color:#D9E4FA;line-height:1.65}
.flip:nth-child(odd) .face.back b{color:var(--green)}
.flip:nth-child(even) .face.back b{color:var(--violet)}

/* PHYSICS */
.phys{background:var(--bg2)}
#physbox{position:relative;height:420px;margin-top:52px;border-radius:24px;border:1px solid var(--line);background:radial-gradient(ellipse at 50% 120%,rgba(43,217,159,.08),transparent),#070F2B;overflow:hidden}
#physcanvas{position:absolute;inset:0}
.phys-hint{position:absolute;top:18px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--muted2);pointer-events:none;text-transform:uppercase}
.phys-btns{position:absolute;bottom:18px;left:0;right:0;display:flex;justify-content:center;gap:12px}

/* WHO */
.who{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:56px}
.who-c{padding:32px;border-radius:22px;background:#FFFFFF;border:1px solid rgba(13,27,62,.1);transition:.35s;position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(13,27,62,.06)}
.who-c::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--green),var(--violet));opacity:0;transition:.35s}
.who-c:hover{border-color:var(--line2)}
.who-c:hover::before{opacity:1}
.who-c h3{font-size:19px;margin:14px 0 10px;color:var(--text-dark)}
.who-c .wic{font-size:30px}
.who-c p{font-size:14px;color:#4A5E80;margin-bottom:16px}
.who-c ul{list-style:none;display:grid;gap:9px}
.who-c li{font-size:13.5px;color:#344060;padding-left:22px;position:relative}
.who-c li::before{content:"→";position:absolute;left:0;color:var(--green-d);font-family:var(--mono)}
.who-c .trial{margin-top:18px;font-family:var(--mono);font-size:11px;color:var(--green-d);border-top:1px dashed rgba(13,27,62,.12);padding-top:14px}

/* PRICING */
.cur-tog{display:inline-flex;border:1px solid rgba(13,27,62,.15);border-radius:100px;padding:4px;margin-top:0;background:#FFFFFF;box-shadow:0 2px 12px rgba(13,27,62,.08)}
.cur-tog button{padding:8px 22px;border-radius:100px;background:transparent;color:#5E6E96;font-weight:600;font-size:13px;transition:.25s}
.cur-tog button.on{background:var(--green-d);color:#fff}
.savechip{display:inline-flex;align-items:center;font-family:var(--mono);font-size:10px;letter-spacing:.12em;background:linear-gradient(120deg,var(--green),#1FBE8B);color:#03200F;padding:3px 10px;border-radius:100px;margin-left:8px;font-weight:700}
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:46px}
.plans-set{display:none}
.plans-set.on{display:grid}
.plan{padding:32px 28px;border-radius:22px;background:#FFFFFF;border:1px solid rgba(13,27,62,.12);position:relative;transition:.3s;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,62,.07)}
.plan:hover{border-color:rgba(43,217,159,.4);box-shadow:0 12px 40px rgba(13,27,62,.12)}
.plan.hot{border-color:var(--green-d);background:linear-gradient(170deg,rgba(29,158,117,.06),#FFFFFF);box-shadow:0 12px 50px rgba(29,158,117,.2)}
.plan .best{position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:10px;letter-spacing:.15em;background:var(--green);color:#03200F;padding:5px 16px;border-radius:100px;font-weight:600;z-index:2}
.plan h4{font-size:16px;font-weight:700;color:var(--text-dark)}
.plan .pw{font-size:12px;color:#5E6E96;margin-bottom:16px}
.price{font-size:38px;font-weight:800;font-family:var(--mono);line-height:1;color:var(--text-dark)}
.price small{font-size:13px;color:#5E6E96;font-family:var(--font);font-weight:500}
.billed{font-size:11.5px;color:#5E6E96;margin-top:6px;font-family:var(--font);font-weight:500}
.plan-badge{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.15em;padding:4px 11px;border-radius:100px;background:rgba(62,166,255,.12);border:1px solid rgba(62,166,255,.4);color:var(--blue);margin-bottom:10px;text-transform:uppercase}
.plan-sub{font-size:12.5px;color:#4A5E80;margin:16px 0 10px}
.plan-sub b{color:var(--text-dark)}
.plan ul{list-style:none;margin:14px 0 22px;display:grid;gap:10px}
.plan li{font-size:13.5px;color:#344060;padding-left:24px;position:relative;display:flex;justify-content:space-between;gap:8px}
.plan li::before{content:"✓";position:absolute;left:0;color:var(--green-d);font-weight:700}
.plan li b{color:var(--text-dark);font-weight:600;font-family:var(--mono);font-size:12.5px}
.plan .btn{width:100%}
.pricenote{font-size:11.5px;color:#5E6E96;margin:10px 0 0;text-align:center}
.pnote{text-align:center;margin-top:26px;font-size:12.5px;color:#5E6E96}

/* BROCHURE / VIDEO */
.bro{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:52px}
.bro-c{padding:30px;border-radius:22px;position:relative;overflow:hidden;border:1px solid var(--line);background:linear-gradient(150deg,rgba(43,217,159,.09),var(--panel));display:flex;flex-direction:column}
.bro-c.mid{background:linear-gradient(150deg,rgba(62,166,255,.09),var(--panel))}
.bro-c.vid{background:linear-gradient(150deg,rgba(139,92,246,.14),var(--panel))}
.bro-c h3{font-size:18px;margin:14px 0 8px}
.bro-c p{color:var(--muted);font-size:13.5px;margin-bottom:18px;flex:1}
.bro-ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.05);border:1px solid var(--line)}
.bro-meta{font-family:var(--mono);font-size:10.5px;color:var(--muted2);letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px}

/* CONTACT */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:52px;align-items:start}
.inp{width:100%;padding:15px 18px;border-radius:13px;background:rgba(255,255,255,.035);border:1px solid var(--line);color:var(--text);font-family:var(--font);font-size:14.5px;margin-bottom:14px;transition:.25s}
.inp:focus{outline:none;border-color:var(--green);box-shadow:0 0 0 3px rgba(43,217,159,.14)}
.inp::placeholder{color:var(--muted2)}
textarea.inp{min-height:110px;resize:vertical}
.wa-btn{background:var(--wa);color:#062B14;width:100%}
.wa-btn:hover{box-shadow:0 10px 34px rgba(37,211,102,.4)}
.c-alt{display:grid;gap:12px;align-content:start}
.c-line{display:flex;gap:14px;align-items:center;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,rgba(17,29,69,.9),rgba(9,18,48,.95));border:1px solid var(--line);position:relative;overflow:hidden;transition:border-color .3s,transform .2s}
.c-line:hover{border-color:rgba(43,217,159,.4);transform:translateX(4px)}
.c-line .ci{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-size:17px;background:rgba(43,217,159,.12);border:1px solid rgba(43,217,159,.3);flex-shrink:0}
.c-line b{display:block;font-size:13.5px;font-weight:600}
.c-line span{font-size:12px;color:var(--muted);margin-top:2px}

/* FINAL CTA / FOOTER */
.final{position:relative;text-align:center;overflow:hidden}
#field2{position:absolute;inset:0;z-index:0}
.final .wrap{position:relative;z-index:2}
.final h2{font-size:clamp(32px,5vw,56px);font-weight:800;line-height:1.12;margin-bottom:16px}
footer{border-top:1px solid rgba(43,217,159,.25);padding:60px 0 36px;background:linear-gradient(180deg,#071031,#050B1D)}
.f-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:34px;margin-bottom:44px}
.f-grid h5{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9FB0D6;margin-bottom:16px}
.f-grid a{display:block;font-size:14px;color:#B7C6E8;margin-bottom:11px;transition:.2s}
.f-grid p{color:#9FB0D6;font-size:13.5px;line-height:1.7}
.f-grid a:hover{color:var(--green)}
.f-bot{display:flex;justify-content:space-between;align-items:center;padding-top:26px;border-top:1px solid var(--line);font-size:12.5px;color:#8FA3CC;flex-wrap:wrap;gap:12px}
.f-bot .parent{color:var(--muted)}
.f-bot .parent a{color:#F0824A;font-weight:600}

/* MAGNETIC PULSE RIPPLE */
.magcard,.who-c,.nudge,.bro-c,.c-line,.tb,.plan{position:relative;overflow:hidden}
.mag-ripple{position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(43,217,159,.55) 0%,rgba(43,217,159,.25) 30%,rgba(43,217,159,0) 65%);pointer-events:none;transform:translate(-50%,-50%) scale(0);opacity:0;transition:opacity .25s ease,transform .25s ease;mix-blend-mode:screen;z-index:0;filter:blur(1px)}
.magcard>*,.who-c>*,.nudge>*,.bro-c>*,.c-line>*,.tb>*,.plan>*{position:relative;z-index:1}
.plan.hot .mag-ripple{background:radial-gradient(circle,rgba(139,92,246,.6) 0%,rgba(139,92,246,.28) 30%,rgba(139,92,246,0) 65%)}
.who-c .mag-ripple{background:radial-gradient(circle,rgba(43,217,159,.5) 0%,rgba(43,217,159,.2) 35%,rgba(43,217,159,0) 65%)}
.nudge .mag-ripple{background:radial-gradient(circle,rgba(43,217,159,.45) 0%,rgba(43,217,159,.18) 35%,rgba(43,217,159,0) 65%)}

/* MODALS */
.modal{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;padding:22px}
.modal.open{display:flex}
.m-bg{position:absolute;inset:0;background:rgba(3,7,20,.82);backdrop-filter:blur(8px)}
.m-card{position:relative;width:min(480px,100%);background:linear-gradient(165deg,#101C42,#0A1230);border:1px solid var(--line2);border-radius:24px;padding:36px;animation:mup .35s cubic-bezier(.2,.9,.3,1.2)}
@keyframes mup{from{opacity:0;transform:translateY(26px) scale(.97)}}
.m-x{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.05);color:var(--muted);font-size:16px;border:1px solid var(--line);cursor:pointer}
.m-card h3{font-size:21px;margin-bottom:8px}
.m-card .msub{font-size:13.5px;color:var(--muted);margin-bottom:22px}
.m-card.wide{width:min(880px,100%);padding:0;overflow:hidden;border-color:rgba(139,92,246,.4)}
.vid-box{aspect-ratio:16/9;display:grid;place-items:center;background:radial-gradient(circle at 50% 50%,rgba(139,92,246,.15),#070F2B);text-align:center;padding:30px}
.vid-box h3{margin-bottom:10px}
.vid-box p{color:var(--muted);font-size:14px;max-width:420px}
.play{width:74px;height:74px;border-radius:50%;background:rgba(139,92,246,.2);border:1px solid rgba(139,92,246,.6);display:grid;place-items:center;font-size:24px;color:#fff;transition:.3s;animation:mpulse 2.4s infinite;cursor:pointer;margin:0 auto 22px}
@keyframes mpulse{0%{box-shadow:0 0 0 0 rgba(139,92,246,.45)}70%{box-shadow:0 0 0 22px rgba(139,92,246,0)}100%{box-shadow:0 0 0 0 rgba(139,92,246,0)}}
.ok-msg{text-align:center;padding:20px 0}
.ok-msg .okic{width:64px;height:64px;border-radius:50%;background:rgba(43,217,159,.15);border:1px solid var(--green);display:grid;place-items:center;font-size:26px;margin:0 auto 16px;color:var(--green)}
.err{color:var(--red);font-size:12.5px;margin:-6px 0 12px}

/* CHATBOT */
#chatFab{position:fixed;bottom:24px;right:24px;z-index:150;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#B79BFF,var(--violet));box-shadow:0 10px 34px rgba(139,92,246,.5);display:grid;place-items:center;font-size:24px;color:#fff;transition:.25s;cursor:pointer}
#chatFab:hover{transform:scale(1.08)}
#chatFab::before{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(139,92,246,.6);animation:fabring 2.2s ease-out infinite}
@keyframes fabring{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.4);opacity:0}}
#chatBox{position:fixed;bottom:96px;right:24px;z-index:150;width:min(360px,calc(100vw - 40px));background:linear-gradient(170deg,#101C42,#0A1230);border:1px solid rgba(139,92,246,.4);border-radius:22px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.6)}
#chatBox.open{display:flex;animation:mup .3s ease}
.cb-head{padding:16px 18px;background:rgba(139,92,246,.14);border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center}
.cb-head b{font-size:14px;display:block}
.cb-head span{font-size:11px;color:var(--green)}
.cb-body{padding:16px;display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto}
.msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:13px;line-height:1.55}
.msg.bot{background:rgba(255,255,255,.05);border:1px solid var(--line);align-self:flex-start}
.msg.me{background:rgba(43,217,159,.16);border:1px solid rgba(43,217,159,.35);align-self:flex-end}
.cb-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px}
.cb-chips button{font-size:11px;padding:7px 13px;border-radius:100px;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);color:#CDBBFF;cursor:pointer}
.cb-foot{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line)}
.cb-foot input{flex:1;padding:11px 14px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid var(--line);color:var(--text);font-size:13px;font-family:var(--font)}
.cb-foot input:focus{outline:none;border-color:var(--violet)}
.cb-foot button{width:42px;border-radius:11px;background:var(--violet);color:#fff;font-size:16px}

.reveal{opacity:0;transform:translateY(34px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.3,1)}
.reveal.in{opacity:1;transform:none}

/* MAG v7 — cursor glow + card spotlight (buttons keep the pull) */
#cursorGlow{position:fixed;top:0;left:0;width:32px;height:32px;border-radius:50%;pointer-events:none;z-index:9999;background:radial-gradient(circle,rgba(43,217,159,.8),rgba(43,217,159,0) 70%);mix-blend-mode:screen;transition:width .2s,height .2s}
#cursorGlow.on-btn{width:52px;height:52px}
.spot{position:relative}
.spot::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%),rgba(43,217,159,.18),transparent 65%);z-index:2}
.spot:hover::after{opacity:1}
.spot:hover{border-color:rgba(43,217,159,.45)}
.magcard,.who-c,.nudge,.bro-c,.tb,.plan,.tstep{transition:transform .35s cubic-bezier(.2,.8,.3,1),border-color .3s,box-shadow .3s}
.magcard:hover,.who-c:hover,.bro-c:hover,.plan:hover,.tstep:hover{transform:translateY(-6px)}
.magnet{transition:transform .35s cubic-bezier(.2,.9,.3,1.5)}
.magnet.pull{transition:transform .09s ease-out}

/* METRICS TICKER */
.tickerwrap{overflow:hidden;background:linear-gradient(90deg,#071031,#0C1738,#071031);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:15px 0}
.ticker{display:flex;gap:48px;white-space:nowrap;width:max-content;animation:tick 28s linear infinite}
.ticker span{font-family:var(--mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9FB0D6}
.ticker span::first-letter{color:var(--green)}
@keyframes tick{to{transform:translateX(-50%)}}

/* LAUNCH OFFER PILL */
.offerbar{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:140;background:linear-gradient(120deg,#0E1B44,#122053);border:1px solid rgba(43,217,159,.5);border-radius:100px;padding:9px 10px 9px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 14px 44px rgba(0,0,0,.5),0 0 30px rgba(43,217,159,.18);font-size:13px;color:#D6E1F8;max-width:calc(100vw - 110px);flex-wrap:wrap}
.offerbar b{color:var(--green)}
.offerbar a{color:#03200F;background:var(--green);padding:7px 15px;border-radius:100px;font-weight:700;font-size:12.5px;white-space:nowrap}
.offerbar button{background:none;color:var(--muted);font-size:14px;padding:2px 6px;cursor:pointer}

/* CONTACT v7 — light */
.cx-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:26px;margin-top:52px;align-items:start}
.cx-card{background:#fff;border:1px solid rgba(13,27,62,.12);border-radius:22px;padding:28px;box-shadow:0 10px 40px rgba(13,27,62,.08)}
.cx-t{color:var(--text-dark);font-size:18px;margin-bottom:16px}
.cx-card .inp{background:#F6F9FF;border:1px solid rgba(13,27,62,.14);color:var(--text-dark)}
.cx-card .inp::placeholder{color:#7688AA}
.cx-card .inp:focus{border-color:var(--green-d);box-shadow:0 0 0 3px rgba(29,158,117,.15)}
.cx-note{font-size:11.5px;color:#5E6E96;margin-top:12px}
.cx-side{display:grid;gap:14px}
.cx-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cx-tile{background:#fff;border:1px solid rgba(13,27,62,.12);border-radius:16px;padding:18px 16px;display:flex;flex-direction:column;gap:4px;box-shadow:0 6px 24px rgba(13,27,62,.06);transition:transform .25s,border-color .25s;color:inherit}
.cx-tile:hover{transform:translateY(-4px);border-color:var(--green-d)}
.cx-tile .ti{font-size:20px}
.cx-tile b{font-size:13.5px;color:var(--text-dark)}
.cx-tile span:last-child{font-size:12px;color:#5E6E96}
.cx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.cx-stats div{text-align:center;background:rgba(29,158,117,.08);border:1px solid rgba(29,158,117,.3);border-radius:14px;padding:14px 8px}
.cx-stats b{display:block;font-family:var(--mono);font-size:15px;color:var(--green-d)}
.cx-stats span{font-size:10.5px;color:#4A5E80}
.cx-map{background:linear-gradient(120deg,rgba(29,158,117,.1),rgba(139,92,246,.1));border:1px dashed rgba(13,27,62,.22);border-radius:14px;padding:14px;text-align:center;font-size:12.5px;color:#3D4F70}

/* PLATE BUILDER */
.plate-wrap{display:grid;grid-template-columns:1.25fr .75fr;gap:26px;margin-top:52px;align-items:start}
.plate-chips{display:flex;flex-wrap:wrap;gap:12px}
.pchip{padding:12px 18px;border-radius:100px;border:1.5px solid var(--line);background:rgba(11,21,51,.85);color:#C9D6F2;font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:8px;transition:.25s;cursor:pointer}
.pchip em{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--muted)}
.pchip:hover{border-color:rgba(43,217,159,.5);transform:translateY(-3px)}
.pchip.on{background:rgba(43,217,159,.16);border-color:var(--green);color:#EAFFF6;box-shadow:0 0 18px rgba(43,217,159,.25)}
.pchip.on em{color:var(--green)}
.plate-side{background:linear-gradient(160deg,var(--panel),#0A1230);border:1px solid var(--line);border-radius:22px;padding:26px}
.plate-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.plate-tot div{text-align:center;padding:12px 6px;border-radius:12px;background:rgba(43,217,159,.07);border:1px solid rgba(43,217,159,.25)}
.plate-tot b{display:block;font-family:var(--mono);font-size:17px;color:var(--green)}
.plate-tot span{font-size:10px;color:var(--muted)}
.plate-bar{height:8px;border-radius:100px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:14px}
.plate-bar i{display:block;height:100%;border-radius:100px;background:linear-gradient(90deg,var(--green),var(--violet));transition:width .5s cubic-bezier(.2,.8,.3,1)}
.plate-verdict{font-size:14px;color:#EAF2FF;margin-bottom:10px}
.plate-note{font-size:12px;color:var(--muted)}
@media (max-width:980px){.plate-wrap{grid-template-columns:1fr}}

/* LIGHT SECTION TEXTURE + AURORA */
.sec-light{position:relative;overflow:hidden}
.sec-light::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(13,27,62,.08) 1px,transparent 1px);background-size:26px 26px;pointer-events:none;mask-image:linear-gradient(180deg,transparent,#000 18%,#000 82%,transparent)}
.aurora{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;opacity:.55;z-index:0}
.au-g{background:rgba(43,217,159,.32)}
.au-v{background:rgba(139,92,246,.26)}
.au-b{background:rgba(62,166,255,.26)}
.sec-light .wrap{position:relative;z-index:1}

/* MINI CLINIC 3D PANEL */
.mini-dash{position:absolute;right:-84px;top:-52px;width:218px;padding:16px;border-radius:16px;background:linear-gradient(160deg,rgba(20,32,74,.97),rgba(9,17,44,.97));border:1px solid rgba(62,166,255,.4);transform:translateZ(130px) rotateY(-10deg);box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 40px rgba(62,166,255,.14)}
.md-t{font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--blue);margin-bottom:10px}
.md-r{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#D6E1F8;padding:6px 0;border-bottom:1px dashed rgba(139,155,191,.15)}
.md-r:last-child{border-bottom:none}
.md-r i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.md-r b{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--green)}

/* CONTACT extras */
.c-line .c-go{margin-left:auto;color:var(--green);font-size:16px;opacity:0;transform:translateX(-6px);transition:.25s;flex-shrink:0}
.c-line:hover .c-go{opacity:1;transform:none}
.c-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px}
.c-stats div{text-align:center;padding:14px 8px;border-radius:14px;background:rgba(43,217,159,.07);border:1px solid rgba(43,217,159,.25)}
.c-stats b{display:block;font-family:var(--mono);font-size:15px;color:var(--green)}
.c-stats span{font-size:10.5px;color:var(--muted)}

/* LIGHT-SECTION color corrections */
.plan .btn-o{color:var(--text-dark);border-color:rgba(13,27,62,.28)}
.plan .btn-o:hover{border-color:var(--green-d);color:var(--green-d)}
.story .tbig{background:linear-gradient(120deg,#0D1B3E 25%,#149E71);-webkit-background-clip:text;background-clip:text;filter:none}
.story .tstep:nth-child(2) .tbig{background:linear-gradient(120deg,#0D1B3E 25%,#2B6CB0);-webkit-background-clip:text;background-clip:text;filter:none}
.story .tstep:nth-child(3) .tbig{background:linear-gradient(120deg,#0D1B3E 25%,#6D3EE8);-webkit-background-clip:text;background-clip:text;filter:none}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
@media (max-width:980px){
  .hero-in,.ai-grid,.contact-grid,.cx-grid{grid-template-columns:1fr}
  .bro,.tsteps,.flips,.who,.plans,.nudges{grid-template-columns:1fr}
  .kpis{grid-template-columns:repeat(2,1fr)}
  .dash-mid{grid-template-columns:1fr}
  .nav-links{display:none}
  .burger{display:block}
  .nav-links.open{display:flex;flex-direction:column;position:absolute;top:64px;left:0;right:0;background:rgba(6,13,34,.97);padding:24px;border-bottom:1px solid var(--line);gap:18px}
  .f-grid{grid-template-columns:1fr 1fr}
  .notif,.mini-dash{display:none}
  .holo{transform:none}
  section{padding:80px 0}
  .hero{padding-top:120px}
  .pulse-track,.tstep .node{display:none}
  .tsteps{padding-top:0}
}
`;

/* ── Real pricing (pulled from live site 05 Jul 2026) ── */
const IND_PLANS = [
  { name:'Starter', sub:'Great to get started', priceINR_m:'₹99', priceINR_a:'₹81', priceUSD_m:'$4.99', priceUSD_a:'$4.09',
    badge:'30-day free trial', hot:false, cta:'Start free trial', ctaHref:'/signup', ctaStyle:'o',
    note:'Then ₹99/month · Cancel anytime',
    intro:null,
    features:['AI chat messages — <b>20/month</b>','AI meal plans — <b>2/month</b>','Food log history — <b>90 days</b>','Daily AI insights','Data export'] },
  { name:'Plus', sub:'Most popular choice', priceINR_m:'₹189', priceINR_a:'₹155', priceUSD_m:'$8.99', priceUSD_a:'$7.37',
    badge:null, hot:true, cta:'Subscribe to Plus', ctaHref:'/signup?skipTrial=1', ctaStyle:'g',
    note:'No trial · Subscribe for 1 month to evaluate',
    intro:'Everything in Starter +',
    features:['AI chat messages — <b>50/month</b>','AI meal plans — <b>8/month</b>','Food log history — <b>1 year</b>','Daily AI insights','Data export — <b>PDF</b>'] },
  { name:'Premium', sub:'For serious goals', priceINR_m:'₹449', priceINR_a:'₹368', priceUSD_m:'$12.99', priceUSD_a:'$10.65',
    badge:null, hot:false, cta:'Subscribe to Premium', ctaHref:'/signup?skipTrial=1', ctaStyle:'o',
    note:'No trial · Subscribe for 1 month to evaluate',
    intro:'Everything in Plus +',
    features:['AI chat messages — <b>100/month</b>','AI meal plans — <b>15/month</b>','Food log history — <b>3 years</b>','Daily AI insights','Data export — <b>PDF + CSV</b>'] },
];
const CLI_PLANS = [
  { name:'Starter', sub:'Solo practice', priceINR_m:'₹499', priceINR_a:'₹409', priceUSD_m:'$12.99', priceUSD_a:'$10.65',
    badge:'14-day free trial', hot:false, cta:'Start 14-day free trial', ctaHref:'/signup?type=clinic', ctaStyle:'o',
    note:'Starter features · Then ₹499/month',
    intro:null,
    features:['Patients — <b>15</b>','AI patient plans — <b>15/month</b>','Dietitian AI chat — <b>30/month</b>','Compliance reports — <b>Basic</b>','Data export'] },
  { name:'Professional', sub:'Growing clinic', priceINR_m:'₹999', priceINR_a:'₹819', priceUSD_m:'$29.99', priceUSD_a:'$24.59',
    badge:null, hot:true, cta:'Subscribe to Professional', ctaHref:'/signup?type=clinic&skipTrial=1', ctaStyle:'g',
    note:'No trial · Subscribe for 1 month to evaluate',
    intro:'Everything in Starter +',
    features:['Patients — <b>50</b>','AI patient plans — <b>40/month</b>','Dietitian AI chat — <b>100/month</b>','Compliance reports — <b>Advanced</b>','Data export — <b>PDF</b>'] },
  { name:'Premium', sub:'Large practice', priceINR_m:'₹2,499', priceINR_a:'₹2,049', priceUSD_m:'$59.99', priceUSD_a:'$49.19',
    badge:null, hot:false, cta:'Subscribe to Premium', ctaHref:'/signup?type=clinic&skipTrial=1', ctaStyle:'o',
    note:'No trial · Subscribe for 1 month to evaluate',
    intro:'Everything in Professional +',
    features:['Patients — <b>200</b>','AI patient plans — <b>100/month</b>','Dietitian AI chat — <b>200/month</b>','Compliance reports — <b>Advanced</b>','Data export — <b>PDF + CSV</b>'] },
];

const BROCHURES = [
  { title:'Personal Health Guide', desc:'How to use Blitora Pulse to build better habits, track nutrition and hit your goals.', meta:'8 pages · PDF', file:'/BlitoraPulse-Personal-Guide.pdf', kind:'' },
  { title:'Clinic & Dietitian Pack', desc:'Patient management, onboarding, compliance tools and clinic pricing plans.', meta:'12 pages · PDF', file:'/BlitoraPulse-Clinic-Brochure.pdf', kind:'mid' },
  { title:'Plan Comparison Sheet', desc:'Side-by-side of all Personal and Clinic plans — perfect for sharing with your team.', meta:'2 pages · PDF', file:'/BlitoraPulse-Plans.pdf', kind:'mid' },
];

const PLANS_BY_DIET = {
  Vegetarian:{b:['Vegetable poha + curd','Moong dal chilla x2 + mint chutney'],s1:['Roasted chana (30 g) + green tea','1 apple + 6 almonds'],l:['2 roti + dal tadka + palak sabzi + salad','Rajma (1 bowl) + brown rice + kachumber'],s2:['Buttermilk + makhana (20 g)','Sprouts bhel (1 bowl)'],d:['Paneer bhurji (150 g) + 1 roti + sauteed veg','Veg khichdi + curd + salad']},
  Eggetarian:{b:['2-egg omelette + 1 multigrain toast','Egg bhurji + poha'],s1:['1 boiled egg + green tea','Fruit bowl + 6 walnuts'],l:['2 roti + egg curry + salad','Dal + rice + boiled egg + sabzi'],s2:['Sprouts chaat','Buttermilk + roasted chana'],d:['Egg white bhurji (3) + 1 roti + veg','Paneer tikka (120 g) + salad']},
  'Non-veg':{b:['2-egg omelette + toast','Chicken keema (80 g) + 1 paratha'],s1:['Greek curd (100 g)','1 banana + peanuts (20 g)'],l:['Grilled chicken (150 g) + 2 roti + salad','Fish curry + brown rice + veg'],s2:['Boiled egg + green tea','Roasted chana + buttermilk'],d:['Tandoori chicken (150 g) + sauteed veg','Fish tikka + dal + salad']},
  Vegan:{b:['Tofu scramble + toast','Oats + soy milk + chia'],s1:['Peanuts (25 g) + black coffee','Fruit + 6 almonds'],l:['2 roti + chana masala + salad','Tofu curry + brown rice + veg'],s2:['Sprouts bhel','Soy milk + makhana'],d:['Tofu bhurji (150 g) + 1 roti + veg','Veg soy khichdi + salad']}
};
const PLANS_BY_DIET_GLOBAL = {
  Vegetarian:{b:['Overnight oats + berries + almond butter','Avocado toast + cherry tomatoes'],s1:['Greek yogurt (100 g) + honey','Apple + peanut butter (1 tbsp)'],l:['Quinoa buddha bowl + chickpeas + tahini','Whole-wheat pasta primavera + side salad'],s2:['Hummus + carrot sticks','Trail mix (30 g)'],d:['Grilled halloumi + roast vegetables','Mushroom risotto + rocket salad']},
  Eggetarian:{b:['2-egg omelette + whole-grain toast','Scrambled eggs + spinach + feta'],s1:['Boiled egg + fruit','Cottage cheese (100 g) + cucumber'],l:['Egg salad wrap + greens','Shakshuka + pita (1)'],s2:['Protein smoothie (whey + banana)','Rice cakes + almond butter'],d:['Veggie frittata + side salad','Egg fried cauliflower rice + veg']},
  'Non-veg':{b:['Eggs + turkey bacon + toast','Smoked salmon + cream cheese bagel (half)'],s1:['Greek yogurt (100 g)','Beef jerky (25 g) + fruit'],l:['Grilled chicken caesar salad','Salmon + quinoa + steamed greens'],s2:['Tuna + crackers','Boiled egg + green tea'],d:['Lean steak + sweet potato + broccoli','Baked cod + roast vegetables']},
  Vegan:{b:['Oats + soy milk + chia + banana','Tofu scramble + whole-grain toast'],s1:['Roasted edamame (30 g)','Fruit + 6 walnuts'],l:['Lentil soup + quinoa salad','Buddha bowl + tofu + tahini'],s2:['Hummus + veggie sticks','Soy latte + rice cakes'],d:['Tempeh stir-fry + brown rice','Chickpea curry + cauliflower rice']}
};
const BOT_ANSWERS = [
  [/diet|chart|plan|meal/i,"You answer 4 questions — goal, conditions, food preference, meals per day — and Pulse AI drafts a full macro-balanced day in seconds. You can refine it in chat: \"make dinner lighter.\" Try the live demo in the Pulse AI section above! ✦"],
  [/price|cost|₹|\$|cheap|plan(s)?$/i,"Individual: Starter free trial then ₹99/mo · Plus ₹189/mo · Premium ₹449/mo. Clinic: Starter ₹499/mo · Professional ₹999/mo · Premium ₹2,499/mo. Annual = 18% off. Flip the toggle in the Pricing section."],
  [/trial|free/i,"Yes! Individuals get a 30-day free trial on the Starter plan. Clinics get 14 days. No credit card needed. Sign up takes under 60 seconds. 🚀"],
  [/clinic|dietitian|patient|hospital/i,"Clinic mode lets you invite patients by email, AI-draft their meal plans and watch compliance live. WhatsApp us at +91 96199 90313 for a demo."],
  [/whatsapp|contact|call|email|human/i,"Fastest: WhatsApp +91 96199 90313. Or email hello@blitora.com. The contact form above opens WhatsApp with your details pre-filled."],
  [/brochure|pdf|download/i,"Head to the Resources section — three PDFs: Personal Guide, Clinic Pack, and Plan Comparison. Enter your name and email, download begins right after. 📄"],
  [/blitora(?!.*pulse)|company|parent/i,"Blitora Pulse is the flagship product of Blitora — a multi-product platform. See blitora.com. Powering Progress. 🧡"],
  [/.*/,"Great question! I cover features, pricing, trials and clinic mode here. For anything deeper, WhatsApp us at +91 96199 90313 — a human replies the same day. 😊"]
];

function detectINR(){
  try{const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;return tz&&(tz.includes('Calcutta')||tz.includes('Kolkata'));}catch{return false;}
}

/* ────── COMPONENT ────── */

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [cur, setCur] = useState('inr');
  const [isIndia, setIsIndia] = useState(true);
  const [bill, setBill] = useState('m');
  const [aud, setAud] = useState('ind');
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [broOpen, setBroOpen] = useState(null); // brochure object or null
  const [vidOpen, setVidOpen] = useState(false);
  const [offerOn, setOfferOn] = useState(true);
  const [magnetOn, setMagnetOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [aiOpts, setAiOpts] = useState({ goal:'Lose weight', diet:'Vegetarian', cond:'None', meals:'5 meals', cuisine:'Indian' });
  const planBodyRef = useRef(null);

  // Session redirect
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const supabase = getSupabase();
        const { data:{ session } } = await supabase.auth.getSession();
        if(session && !cancelled){ router.replace('/dashboard'); return; }
      }catch(e){}
      if(!cancelled) setChecking(false);
    })();
    return ()=>{cancelled=true};
  },[router]);

  // Currency auto-detect
  useEffect(()=>{ const ind=detectINR(); setIsIndia(ind); if(!ind){ setCur('usd'); setAiOpts(s=>({...s,cuisine:'Global'})); } },[]);

  // Nav scroll
  useEffect(()=>{
    const on=()=>setScrolled(window.scrollY>40);
    window.addEventListener('scroll',on,{passive:true});
    return ()=>window.removeEventListener('scroll',on);
  },[]);

  // Reveal on scroll + ECG color shift
  useEffect(()=>{
    if(checking)return;
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

    // ECG scroll color shift
    const ecgPaths=document.querySelectorAll('.ecg-path');
    const onScroll=()=>{
      const pct=window.scrollY/(document.body.scrollHeight-window.innerHeight);
      ecgPaths.forEach((p,i)=>{
        const offset=(i/Math.max(ecgPaths.length-1,1));
        const localPct=Math.min(1,Math.max(0,(pct*2.5)-offset*.6));
        // Interpolate green→violet
        const r=Math.round(43+(139-43)*localPct);
        const g=Math.round(217+(92-217)*localPct);
        const b2=Math.round(159+(246-159)*localPct);
        const gradId=p.getAttribute('stroke');
        const svgDefs=p.closest('svg')&&p.closest('svg').querySelector('defs linearGradient');
        if(svgDefs){
          const stops=svgDefs.querySelectorAll('stop');
          if(stops[1])stops[1].setAttribute('stop-color',`rgb(${r},${g},${b2})`);
          if(stops[2])stops[2].setAttribute('stop-color',`rgb(${Math.round(139+(43-139)*(1-localPct))},${Math.round(92+(217-92)*(1-localPct))},${Math.round(246+(159-246)*(1-localPct))})`);
        }
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    return ()=>{io.disconnect();window.removeEventListener('scroll',onScroll);};
  },[checking]);

  // Counters
  useEffect(()=>{
    if(checking)return;
    const cio=new IntersectionObserver(es=>es.forEach(e=>{
      if(!e.isIntersecting)return;const el=e.target,end=+el.dataset.count,pre=el.dataset.prefix||'',suf=el.dataset.suffix||'';
      let t0=null;cio.unobserve(el);
      function step(ts){if(!t0)t0=ts;const p=Math.min((ts-t0)/1100,1);
        el.innerHTML=pre+Math.round(end*(1-Math.pow(1-p,3)))+suf;if(p<1)requestAnimationFrame(step);}
      requestAnimationFrame(step);
    }),{threshold:.5});
    document.querySelectorAll('.tbig').forEach(el=>cio.observe(el));
    return ()=>cio.disconnect();
  },[checking]);

  // Magnetics v7 — buttons pull + card spotlight + cursor glow (no card transforms = no jank)
  useEffect(()=>{
    if(checking)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hover=matchMedia('(hover:hover)').matches;
    if(reduced||!hover)return;
    document.querySelectorAll('.magcard,.who-c,.nudge,.bro-c,.tb,.plan,.flip,.tstep').forEach(c=>c.classList.add('spot'));
    const glow=document.createElement('div');glow.id='cursorGlow';document.body.appendChild(glow);
    let gx=innerWidth/2,gy=innerHeight/2,tx=gx,ty=gy,raf=0,lastBtn=null;
    const loop=()=>{gx+=(tx-gx)*.18;gy+=(ty-gy)*.18;glow.style.transform=`translate(${(gx-16).toFixed(1)}px,${(gy-16).toFixed(1)}px)`;raf=requestAnimationFrame(loop);};
    raf=requestAnimationFrame(loop);
    const move=e=>{
      tx=e.clientX;ty=e.clientY;
      const card=e.target.closest?e.target.closest('.spot'):null;
      if(card){const b=card.getBoundingClientRect();
        card.style.setProperty('--mx',(e.clientX-b.left)+'px');
        card.style.setProperty('--my',(e.clientY-b.top)+'px');}
      const btn=e.target.closest?e.target.closest('.magnet'):null;
      if(lastBtn&&lastBtn!==btn){lastBtn.classList.remove('pull');lastBtn.style.transform='';}
      lastBtn=btn;
      if(btn){const r=btn.getBoundingClientRect();btn.classList.add('pull');
        btn.style.transform=`translate(${((e.clientX-r.left-r.width/2)*.3).toFixed(1)}px,${((e.clientY-r.top-r.height/2)*.3).toFixed(1)}px) scale(1.05)`;}
      glow.classList.toggle('on-btn',!!btn);
    };
    const leave=()=>{if(lastBtn){lastBtn.classList.remove('pull');lastBtn.style.transform='';lastBtn=null;}};
    document.addEventListener('mousemove',move,{passive:true});
    document.documentElement.addEventListener('mouseleave',leave);
    return ()=>{cancelAnimationFrame(raf);glow.remove();
      document.removeEventListener('mousemove',move);
      document.documentElement.removeEventListener('mouseleave',leave);};
  },[checking]);

  // Hero phone tilt + Holo tilt
  useEffect(()=>{
    if(checking)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced)return;
    const hp=document.getElementById('heroPhone'),hero=document.querySelector('.hero');
    const heroMove=e=>{if(!hp)return;const r=hp.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      hp.style.transform=`rotateY(${-14+(e.clientX-cx)/60}deg) rotateX(${6-(e.clientY-cy)/60}deg)`;};
    hero&&hero.addEventListener('mousemove',heroMove);
    const holo=document.getElementById('holo'),stage=holo&&holo.parentElement;
    const holoMove=e=>{if(!holo||!stage)return;const r=stage.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      holo.style.transform=`rotateX(${14-y*16}deg) rotateY(${-6+x*18}deg)`;};
    const holoLeave=()=>{if(holo)holo.style.transform='rotateX(14deg) rotateY(-6deg)';};
    stage&&stage.addEventListener('mousemove',holoMove);
    stage&&stage.addEventListener('mouseleave',holoLeave);
    return ()=>{
      hero&&hero.removeEventListener('mousemove',heroMove);
      stage&&stage.removeEventListener('mousemove',holoMove);
      stage&&stage.removeEventListener('mouseleave',holoLeave);
    };
  },[checking]);

  // Dashboard breathing
  useEffect(()=>{
    if(checking)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced)return;
    const holo=document.getElementById('holo');if(!holo)return;
    const timers=[];
    const dio=new IntersectionObserver(es=>es.forEach(e=>{
      if(!e.isIntersecting)return;dio.unobserve(e.target);
      const cal=e.target.querySelector('.kpi .kv.g');if(cal){let base=1460,dir=1;timers.push(setInterval(()=>{base+=dir*(Math.random()*4|0);if(base>1478)dir=-1;if(base<1452)dir=1;cal.textContent=base.toLocaleString('en-IN');},1600));}
      e.target.querySelectorAll('.bar').forEach((b,i)=>{b.style.transitionDelay=(i*90)+'ms';timers.push(setInterval(()=>{b.style.transform=`scaleY(${(1+Math.random()*.04-.02).toFixed(3)})`;},1400+i*70));});
    }),{threshold:.3});
    dio.observe(holo);
    return ()=>{timers.forEach(clearInterval);dio.disconnect();};
  },[checking]);

  // Gravity + Magnet playground (Matter.js)
  useEffect(()=>{
    if(checking)return;
    const box=document.getElementById('physbox');if(!box)return;
    let engine,render,runner;
    const load=()=>new Promise((res,rej)=>{if(window.Matter){res(window.Matter);return;}
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      s.onload=()=>res(window.Matter);s.onerror=rej;document.head.appendChild(s);});
    const io=new IntersectionObserver(async es=>{
      if(!es[0].isIntersecting||engine)return;io.disconnect();
      try{const M=await load();
        const cv=document.getElementById('physcanvas'),w=box.offsetWidth,hh=box.offsetHeight;
        engine=M.Engine.create();engine.gravity.y=1;window._physEngine=engine;
        render=M.Render.create({canvas:cv,engine,options:{width:w,height:hh,wireframes:false,background:'transparent',pixelRatio:window.devicePixelRatio||1}});
        const wall={isStatic:true,render:{visible:false}};
        M.Composite.add(engine.world,[
          M.Bodies.rectangle(w/2,hh+28,w,60,wall),M.Bodies.rectangle(w/2,-300,w,60,wall),
          M.Bodies.rectangle(-28,hh/2,60,hh*3,wall),M.Bodies.rectangle(w+28,hh/2,60,hh*3,wall)]);
        const FOODS=[['Paneer 150g · 27g P','#2BD99F'],['Dal bowl · 9g P','#F5B544'],['2 Roti · 6g P','#8B5CF6'],['Egg x2 · 12g P','#3EA6FF'],['Chicken 150g · 33g P','#F4645F'],['Curd 100g · 4g P','#2BD99F'],['Almonds 10 · 3g P','#8B5CF6'],['Sprouts · 8g P','#2BD99F'],['Salmon 100g · 20g P','#3EA6FF'],['Greek yogurt · 10g P','#2BD99F'],['Tofu 100g · 8g P','#8B5CF6'],['Quinoa cup · 8g P','#F5B544'],['Oats bowl · 6g P','#F5B544'],['Avocado ½ · 2g P','#2BD99F']];
        const makeFood=x=>{const [label,color]=FOODS[Math.floor(Math.random()*FOODS.length)];
          const wd=Math.max(96,label.length*7.4),b=M.Bodies.rectangle(x,-30,wd,40,{chamfer:{radius:19},restitution:.55,friction:.28,render:{fillStyle:'rgba(11,21,51,.95)',strokeStyle:color,lineWidth:1.6}});
          b.foodLabel=label;b.foodColor=color;return b;};
        for(let i=0;i<10;i++)setTimeout(()=>M.Composite.add(engine.world,makeFood(60+Math.random()*(w-120))),i*140);
        const mouse=M.Mouse.create(cv),mc=M.MouseConstraint.create(engine,{mouse,constraint:{stiffness:.18,render:{visible:false}}});
        M.Composite.add(engine.world,mc);
        if(mouse.element&&mouse.mousewheel)mouse.element.removeEventListener('wheel',mouse.mousewheel);
        // MAGNET MODE — every chip is attracted to the cursor
        M.Events.on(engine,'beforeUpdate',()=>{
          if(!window._magnetMode)return;
          const mp=mouse.position;if(!mp||mp.x===undefined||mp.x===-1)return;
          for(const b of M.Composite.allBodies(engine.world)){
            if(!b.foodLabel)continue;
            const dx=mp.x-b.position.x,dy=mp.y-b.position.y,d=Math.max(Math.hypot(dx,dy),40);
            const f=(.00011*b.mass*Math.min(d,220))/d;
            M.Body.applyForce(b,b.position,{x:dx*f,y:dy*f});
          }
        });
        M.Render.run(render);runner=M.Runner.create();M.Runner.run(runner,engine);
        M.Events.on(render,'afterRender',()=>{const c=render.context;
          c.font='600 12px Poppins,Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';
          for(const b of M.Composite.allBodies(engine.world)){if(!b.foodLabel)continue;
            c.save();c.translate(b.position.x,b.position.y);c.rotate(b.angle);
            c.fillStyle=b.foodColor;c.shadowColor=b.foodColor;c.shadowBlur=6;
            c.fillText(b.foodLabel,0,1);c.restore();}});
        window._physDrop=()=>M.Composite.add(engine.world,makeFood(60+Math.random()*(w-120)));
        let flipped=false;window._physFlip=()=>{flipped=!flipped;engine.gravity.y=flipped?-1:1;};
        window._physBoom=()=>{for(const b of M.Composite.allBodies(engine.world)){if(!b.foodLabel)continue;
          M.Body.setVelocity(b,{x:(Math.random()-.5)*18,y:-(6+Math.random()*11)});
          M.Body.setAngularVelocity(b,(Math.random()-.5)*.45);}};
      }catch(e){console.warn('physics load failed',e);}
    },{threshold:.25});
    io.observe(box);
    return ()=>{io.disconnect();window._magnetMode=false;
      if(runner&&window.Matter)window.Matter.Runner.stop(runner);
      if(render&&window.Matter)window.Matter.Render.stop(render);
      if(engine&&window.Matter)window.Matter.Engine.clear(engine);};
  },[checking]);

  // Escape key closes modals
  useEffect(()=>{
    const on=e=>{if(e.key==='Escape'){setBroOpen(null);setVidOpen(false);}};
    window.addEventListener('keydown',on);return ()=>window.removeEventListener('keydown',on);
  },[]);

  // AI generate diet chart
  const genPlan = useCallback(()=>{
    const body=planBodyRef.current;if(!body)return;
    const { goal, diet, cond, meals, cuisine } = aiOpts;
    body.innerHTML=`<div class="thinking"><div class="tdots"><i></i><i></i><i></i></div>Pulse AI is drafting your day — ${goal.toLowerCase()}, ${diet.toLowerCase()}${cond!=='None'?', '+cond.toLowerCase()+'-safe':''}…</div>`;
    setTimeout(()=>{
      const P=(cuisine==='Global'?PLANS_BY_DIET_GLOBAL:PLANS_BY_DIET)[diet],six=meals.startsWith('6'),three=meals.startsWith('3');
      const kcal=goal==='Gain muscle'?2100:goal==='Lose weight'?1450:1700;
      const prot=goal==='Gain muscle'?110:goal==='Lose weight'?85:75;
      const pick=a=>a[Math.floor(Math.random()*a.length)];
      let rows=[['Breakfast',pick(P.b),'~320 kcal · 18 g P']];
      if(!three)rows.push(['Mid-morning',pick(P.s1),'~140 kcal · 7 g P']);
      rows.push(['Lunch',pick(P.l),'~460 kcal · 26 g P']);
      if(!three)rows.push(['Evening',pick(P.s2),'~150 kcal · 8 g P']);
      if(six)rows.push(['Pre-dinner','Clear veg soup (1 bowl)','~80 kcal · 3 g P']);
      rows.push(['Dinner',pick(P.d),'~380 kcal · 26 g P']);
      body.innerHTML=rows.map(r=>`<div class="meal-row show"><span class="mt">${r[0]}</span><span class="mf" data-full="${r[1].replace(/"/g,'&quot;')}"><span class="typed"></span><span class="cursor"></span>${cond==='Diabetes T2'?' <span style="color:var(--blue);font-size:11px;opacity:0" class="lowgi">· low-GI</span>':''}</span><span class="mk" style="opacity:0">${r[2]}</span></div>`).join('')
        +`<div class="plan-tot" id="ptot" style="opacity:0;transform:translateY(8px);transition:.5s"><div class="ptot"><b>~${kcal.toLocaleString('en-IN')}</b><span>kcal target</span></div><div class="ptot"><b>${prot} g</b><span>protein</span></div><div class="ptot"><b>8</b><span>glasses water</span></div><div class="ptot"><b>3</b><span>walks</span></div></div>
        <p id="prefine" style="font-size:11.5px;color:var(--muted2);margin-top:14px;opacity:0;transition:.5s .3s">✦ In the app you can refine this in chat — "make dinner lighter", "no mushrooms" — and it re-drafts instantly.</p>`;
      const rowsEl=[...body.querySelectorAll('.meal-row')];let ri=0;
      function typeRow(){
        if(ri>=rowsEl.length){const pt=document.getElementById('ptot'),pr=document.getElementById('prefine');if(pt){pt.style.opacity='1';pt.style.transform='none';}if(pr)pr.style.opacity='1';return;}
        const row=rowsEl[ri],mf=row.querySelector('.typed'),cur=row.querySelector('.cursor'),full=row.querySelector('.mf').dataset.full,mk=row.querySelector('.mk'),lg=row.querySelector('.lowgi');
        let ci=0;const t=setInterval(()=>{
          if(ci>=full.length){clearInterval(t);cur.style.display='none';mk.style.transition='opacity .35s';mk.style.opacity='1';if(lg)lg.style.opacity='1';ri++;setTimeout(typeRow,110);return;}
          mf.textContent=full.slice(0,++ci);
        },16);
      }
      setTimeout(typeRow,180);
    },1400);
  },[aiOpts]);

  const priceFor=(p)=> cur==='inr'? (bill==='m'?p.priceINR_m:p.priceINR_a) : (bill==='m'?p.priceUSD_m:p.priceUSD_a);
  const currentPlans = aud==='ind'?IND_PLANS:CLI_PLANS;
  const billedTxt = bill==='a'?'billed annually · save 18%':'billed monthly · cancel anytime';
  const noteCurrency = cur==='usd'?'Prices in US Dollars (USD). Tax may apply.':'Prices in Indian Rupees (INR). GST may apply.';

  if(checking){
    return <div style={{minHeight:'100vh',background:'#060D22',display:'grid',placeItems:'center',color:'#8B9BBF',fontFamily:"'Poppins',sans-serif"}}>Loading…</div>;
  }

  const LogoSVG = ()=> (
    <svg viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="#0D1B3E"/>
      <text x="9" y="27" fontFamily="Poppins,Arial" fontWeight="800" fontSize="22" fill="#EAF2FF">B</text>
      <path d="M24 8 L19 19 L24 19 L20 30 L29 16 L24 16 Z" fill="#2BD99F"/>
      <path d="M6 33 h8 l2-4 3 7 2-5 h13" stroke="#2BD99F" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
    </svg>
  );

  const HeroLine = ({seed})=> (
    <div className="heroline" aria-hidden="true"><svg viewBox="0 0 1400 120" preserveAspectRatio="none">
      <defs><linearGradient id={`hlg${seed}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2BD99F" stopOpacity="0"/><stop offset=".25" stopColor="#2BD99F"/><stop offset=".75" stopColor="#8B5CF6"/><stop offset="1" stopColor="#8B5CF6" stopOpacity="0"/>
      </linearGradient></defs>
      <path className="hl-path" stroke={`url(#hlg${seed})`} d="M0 60 L240 60 L262 60 L274 34 L288 88 L302 18 L316 100 L330 44 L344 60 L620 60 L642 60 L654 32 L668 90 L682 16 L696 102 L710 42 L724 60 L1000 60 L1022 60 L1034 34 L1048 88 L1062 18 L1076 100 L1090 44 L1104 60 L1400 60"/>
    </svg></div>
  );

  const ecg = (seed)=> (
    <div className="ecg-div reveal" aria-hidden="true"><svg viewBox="0 0 1400 60" preserveAspectRatio="none">
      <defs><linearGradient id={`ecgG${seed}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2BD99F" stopOpacity="0"/>
        <stop offset=".3" stopColor="#2BD99F" stopOpacity=".8"/>
        <stop offset=".7" stopColor="#8B5CF6" stopOpacity=".8"/>
        <stop offset="1" stopColor="#8B5CF6" stopOpacity="0"/>
      </linearGradient></defs>
      <path className="ecg-path" stroke={`url(#ecgG${seed})`} d="M0 30 L280 30 L305 30 L318 12 L332 48 L346 8 L360 52 L374 22 L390 30 L680 30 L705 30 L718 14 L732 46 L746 10 L760 50 L774 24 L790 30 L1080 30 L1105 30 L1118 12 L1132 48 L1146 8 L1160 52 L1174 22 L1190 30 L1400 30"/>
    </svg></div>
  );

  return (
    <>
      <Head>
        <title>Blitora Pulse — AI Health Tracking for Individuals, Dietitians &amp; Clinics | Health Made Intelligent</title>
        <meta name="description" content="Blitora Pulse is an AI-powered health platform. Sign up in under 60 seconds, get your first AI diet chart in 3 minutes, and spend just seconds a day logging. For individuals, dietitians and clinics across India and the Gulf." />
        <meta name="keywords" content="AI health tracking, diet chart AI, dietitian software India, clinic patient management, calorie tracker India, Blitora Pulse" />
        <meta name="geo.region" content="IN-MH" />
        <meta name="geo.placename" content="Mumbai" />
        <meta property="og:title" content="Blitora Pulse — Health Made Intelligent." />
        <meta property="og:description" content="AI diet charts, daily insights and smart nudges. 60 seconds to sign up. Seconds a day to stay on track." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pulse.blitora.com" />
        <meta property="og:site_name" content="Blitora Pulse" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://pulse.blitora.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication","name":"Blitora Pulse","applicationCategory":"HealthApplication","operatingSystem":"Web, iOS, Android (PWA)","description":"AI-powered health tracking and patient management platform for individuals, dietitians and clinics.","url":"https://pulse.blitora.com","brand":{"@type":"Brand","name":"Blitora","url":"https://blitora.com"},"offers":{"@type":"AggregateOffer","priceCurrency":"INR","lowPrice":"99","offerCount":"6"},"publisher":{"@type":"Organization","name":"Blitora","url":"https://blitora.com","email":"hello@blitora.com"}}) }} />
      </Head>
      <style dangerouslySetInnerHTML={{__html: CSS}} />
      <div className="grain" />
      {offerOn && (
        <div className="offerbar" role="note">
          <span>🚀 <b>Launch offer:</b> first 100 signups get <b>1 month of Plus free</b></span>
          <a href="/signup?offer=launch100">Claim →</a>
          <button aria-label="Dismiss offer" onClick={()=>setOfferOn(false)}>✕</button>
        </div>
      )}
      <a href="#content" className="skip">Skip to content</a>

      {/* NAV */}
      <nav className={"mainnav "+(scrolled?'scrolled':'')} id="nav">
        <div className="wrap nav-in">
          <a className="logo" href="#top" aria-label="Blitora Pulse home">
            <div className="logo-mark"><LogoSVG/></div>
            <div>
              <span className="logo-word">BLITORA <em>PULSE</em></span>
              <span className="logo-tag">Health Made Intelligent.</span>
            </div>
          </a>
          <div className={"nav-links"+(navOpen?' open':'')}>
            <a href="#ai" onClick={()=>setNavOpen(false)}>Pulse AI</a>
            <a href="#dash" onClick={()=>setNavOpen(false)}>Product</a>
            <a href="#features" onClick={()=>setNavOpen(false)}>Features</a>
            <a href="#pricing" onClick={()=>setNavOpen(false)}>Pricing</a>
            <a href="#contact" onClick={()=>setNavOpen(false)}>Contact</a>
            <a href="https://blitora.com" target="_blank" rel="noreferrer" style={{color:'#F0824A'}}>← Blitora</a>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <a className="btn btn-o btn-sm magnet" href="/login">Sign in</a>
            <a className="btn btn-g btn-sm magnet" href="/signup">Start free trial</a>
            <button className="burger" aria-label="Menu" onClick={()=>setNavOpen(o=>!o)}>☰</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <HeroLine seed="A"/>
        <div className="hero-glow hg1"></div>
        <div className="hero-glow hg2"></div>
        <div className="wrap hero-in">
          <div>
            <div className="pill"><span className="dot"></span> PULSE AI · LIVE ON EVERY PLAN</div>
            <h1>Your health, tracked by AI.<br/><span className="grad">Your effort: seconds a day.</span></h1>
            <p className="hero-sub">Blitora Pulse turns meals, water, walks, weight, BP and sugar into an AI-built diet plan, a daily insight card, and nudges so specific they name the food and the grams.</p>
            <div className="hero-ctas">
              <a className="btn btn-g magnet" href="/signup">Start free trial <span style={{display:'inline-block',transition:'transform .3s'}}>→</span></a>
              <button className="btn btn-v magnet" onClick={()=>setVidOpen(true)}>▶ Watch 90-sec video</button>
              <button className="btn btn-o magnet" onClick={()=>setBroOpen(BROCHURES[0])}>↓ Download brochure</button>
            </div>
            <div className="time-badges">
              <div className="tb"><b>&lt; 60 sec</b><span>to sign up</span></div>
              <div className="tb"><b>~ 3 min</b><span>to your first AI diet chart</span></div>
              <div className="tb"><b>20 sec/day</b><span>is all logging takes</span></div>
            </div>
          </div>
          <div className="hero-phone">
            <div className="phone-halo" aria-hidden="true"></div>
            <div className="phone" id="heroPhone" role="img" aria-label="Blitora Pulse app preview">
              <div className="phone-scr">
                <div className="p-top"><span style={{fontFamily:'var(--mono)'}}>09:41</span><div className="p-orb"></div></div>
                <div className="p-hi">Good morning, <span>Azeem</span> ⚡ 12-day streak</div>
                <div className="p-card">
                  <span className="lab">✦ Pulse AI — Today's insight</span>
                  <p>Protein was low yesterday. Add <b>150 g paneer bhurji</b> at dinner tonight for <b>+27 g protein</b> — you'll hit your target.</p>
                </div>
                <div className="p-rings">
                  <div className="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.08)" strokeWidth="5" fill="none"/><circle cx="20" cy="20" r="16" stroke="#2BD99F" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="28" pathLength="100"/></svg><span className="rv">1,460</span><span className="rl">kcal</span></div>
                  <div className="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.08)" strokeWidth="5" fill="none"/><circle cx="20" cy="20" r="16" stroke="#3EA6FF" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="46" pathLength="100"/></svg><span className="rv">62 g</span><span className="rl">protein</span></div>
                  <div className="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.08)" strokeWidth="5" fill="none"/><circle cx="20" cy="20" r="16" stroke="#F5B544" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="18" pathLength="100"/></svg><span className="rv">168 g</span><span className="rl">carbs</span></div>
                </div>
                <div className="p-row">
                  <div className="p-mini"><b>6/8</b><span>glasses</span></div>
                  <div className="p-mini"><b>2/3</b><span>walks</span></div>
                  <div className="p-mini"><b>72.4</b><span>kg</span></div>
                </div>
              </div>
            </div>
            <div className="notif n1">✦ <b>Pulse AI:</b> Your BP log looks stable this week — great consistency.</div>
            <div className="notif n2">✦ <b>Dr. Meera</b> updated your dinner plan · tap to review</div>
          </div>
        </div>
        <div className="scroll-cue">Scroll — gravity does the rest ↓</div>
      </header>

      <main id="content">

      {/* METRICS TICKER */}
      <div className="tickerwrap" aria-hidden="true">
        <div className="ticker">
          {['AI diet charts','Smart nudges','BP & sugar logs','Clinic mode','PDF reports','WhatsApp support','Daily insights','Streaks & habits','AI diet charts','Smart nudges','BP & sugar logs','Clinic mode','PDF reports','WhatsApp support','Daily insights','Streaks & habits'].map((t,i)=>(<span key={i}>✦ {t}</span>))}
        </div>
      </div>

      {/* TIME STORY */}
      <section className="story sec-light" id="story">
        <div className="aurora au-g" style={{width:540,height:540,top:-180,left:-160}} />
        <div className="aurora au-v" style={{width:460,height:460,bottom:-200,right:-140}} />
        {ecg(1)}
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">The whole journey, timed</span>
            <h2 className="sec">Health tracking that respects <span className="g">your time.</span></h2>
            <p className="sub">Most health apps demand your day. Pulse asks for moments — and the AI does the heavy lifting in between.</p>
          </div>
          <div className="tline reveal">
            <div className="pulse-track"><span className="pulse-dot"></span></div>
            <div className="tsteps">
              <div className="tstep magcard">
                <div className="node"><i></i></div>
                <span className="tphase">Once · Minute 1</span>
                <div className="tbig" data-count="60" data-prefix="&lt; " data-suffix=" sec">0</div>
                <h3>Create your account</h3>
                <p>Email or Google. No credit card. You're in before your chai cools.</p>
              </div>
              <div className="tstep magcard">
                <div className="node"><i></i></div>
                <span className="tphase">Once · Minute 4</span>
                <div className="tbig" data-count="3" data-prefix="~ " data-suffix=" min">0</div>
                <h3>First AI diet chart</h3>
                <p>Answer 4 questions — goal, conditions, food preference, meals per day. Pulse AI builds your personal plan.</p>
              </div>
              <div className="tstep magcard">
                <div className="node"><i></i></div>
                <span className="tphase">Daily · Forever</span>
                <div className="tbig" data-count="20" data-suffix=" sec<small>/day</small>">0</div>
                <h3>Stay on track daily</h3>
                <p>Tap what you ate, tap your water. AI reads the data and nudges you — you just live your life.</p>
              </div>
            </div>
          </div>
          <p className="tcap reveal">That's it. <b>Under 5 minutes once</b> — then seconds a day, forever.</p>
        </div>
      </section>

      {/* AI DEMO */}
      <section id="ai">
        {ecg(2)}
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">Try it right here</span>
            <h2 className="sec">Watch Pulse AI build <span className="g">a diet chart</span> in front of you.</h2>
            <p className="sub">This is the exact flow inside the app. Pick your answers — the AI drafts a full day, macro-balanced, in seconds.</p>
          </div>
          <div className="ai-grid">
            <div className="card reveal">
              <span className="f-label">Your goal</span>
              <div className="opts">
                {['Lose weight','Gain muscle','Manage diabetes','Maintain'].map(o=>
                  <button key={o} className={"opt"+(aiOpts.goal===o?' on':'')} onClick={()=>setAiOpts(s=>({...s,goal:o}))}>{o}</button>)}
              </div>
              <span className="f-label">Food preference</span>
              <div className="opts">
                {['Vegetarian','Eggetarian','Non-veg','Vegan'].map(o=>
                  <button key={o} className={"opt"+(aiOpts.diet===o?' on':'')} onClick={()=>setAiOpts(s=>({...s,diet:o}))}>{o}</button>)}
              </div>
              <span className="f-label">Health condition</span>
              <div className="opts">
                {['None','Diabetes T2','High BP','Thyroid / PCOD'].map(o=>
                  <button key={o} className={"opt"+(aiOpts.cond===o?' on':'')} onClick={()=>setAiOpts(s=>({...s,cond:o}))}>{o}</button>)}
              </div>
              <span className="f-label">Meals per day</span>
              <div className="opts">
                {['3 meals','5 meals','6 meals'].map(o=>
                  <button key={o} className={"opt"+(aiOpts.meals===o?' on':'')} onClick={()=>setAiOpts(s=>({...s,meals:o}))}>{o}</button>)}
              </div>
              <span className="f-label">Cuisine style</span>
              <div className="opts">
                {['Indian','Global'].map(o=>
                  <button key={o} className={"opt"+(aiOpts.cuisine===o?' on':'')} onClick={()=>setAiOpts(s=>({...s,cuisine:o}))}>{o}</button>)}
              </div>
              <button className="btn btn-g magnet gen-btn" onClick={genPlan}>✦ Generate my AI diet chart</button>
            </div>
            <div className="card plan-out reveal">
              <div className="plan-head"><h4>Your day, drafted by Pulse AI</h4><span className="tag">✦ AI GENERATED</span></div>
              <div ref={planBodyRef}>
                <div className="thinking">Pick your answers and hit generate — the AI responds like it does in the app.</div>
              </div>
            </div>
          </div>
          <div className="nudges reveal">
            <div className="nudge"><span className="nl">Nudge · 7:42 PM</span>You took low protein today — add protein at dinner. Try <b>150 g paneer bhurji (+27 g)</b> or <b>2 boiled eggs (+12 g)</b>.</div>
            <div className="nudge"><span className="nl">Nudge · 3:15 PM</span>You're <b>2 glasses</b> behind on water. One now, one at 5 PM and you'll hit your 8-glass goal.</div>
            <div className="nudge"><span className="nl">Insight · 8:00 AM</span>Your fasting sugar has stayed under <b>110 mg/dL</b> for 6 days straight. Whatever you're doing at dinner — keep it.</div>
          </div>
        </div>
      </section>

      {/* 3D DASHBOARD */}
      <section className="dash-sec" id="dash">
        {ecg(3)}
        <div className="wrap">
          <div className="reveal" style={{textAlign:'center',maxWidth:700,margin:'0 auto'}}>
            <span className="eyebrow" style={{justifyContent:'center'}}>The command centre</span>
            <h2 className="sec">A dashboard that feels <span className="g">holographic.</span></h2>
            <p className="sub" style={{margin:'0 auto'}}>Move your cursor over it. Every layer floats at its own depth — KPIs, charts and AI alerts hovering above the glass.</p>
          </div>
          <div className="stage reveal">
            <div className="holo" id="holo">
              <div className="dash">
                <div className="dash-top">
                  <span className="dt">⚡ Pulse Dashboard — This week</span>
                  <span className="dd">LIVE</span>
                </div>
                <div className="kpis">
                  <div className="kpi"><div className="kv g">1,460</div><div className="kl">kcal today</div><div className="ks">▲ on target</div></div>
                  <div className="kpi"><div className="kv b">62 g</div><div className="kl">protein</div><div className="ks">72% of goal</div></div>
                  <div className="kpi"><div className="kv a">118/78</div><div className="kl">blood pressure</div><div className="ks">normal</div></div>
                  <div className="kpi"><div className="kv v">104</div><div className="kl">fasting sugar</div><div className="ks">▼ 6-day best</div></div>
                </div>
                <div className="dash-mid">
                  <div className="chart-card">
                    <div className="cl"><b>Calories · 7 days</b><span>goal 1,500</span></div>
                    <div className="bars">
                      <div className="bar" style={{height:'62%'}}></div><div className="bar" style={{height:'78%'}}></div>
                      <div className="bar" style={{height:'55%'}}></div><div className="bar" style={{height:'88%'}}></div>
                      <div className="bar" style={{height:'70%'}}></div><div className="bar" style={{height:'95%'}}></div>
                      <div className="bar" style={{height:'82%'}}></div>
                    </div>
                  </div>
                  <div className="chart-card">
                    <div className="cl"><b>Macro split</b><span>today</span></div>
                    <div className="donut-wrap">
                      <svg className="donut" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6"/>
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#2BD99F" strokeWidth="6" strokeDasharray="46 54" strokeDashoffset="25" pathLength="100" strokeLinecap="round"/>
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#3EA6FF" strokeWidth="6" strokeDasharray="24 76" strokeDashoffset="-21" pathLength="100" strokeLinecap="round"/>
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#F5B544" strokeWidth="6" strokeDasharray="22 78" strokeDashoffset="-46" pathLength="100" strokeLinecap="round"/>
                      </svg>
                      <div className="dleg">
                        <span><i style={{background:'#2BD99F'}}></i>Carbs 46%</span>
                        <span><i style={{background:'#3EA6FF'}}></i>Protein 24%</span>
                        <span><i style={{background:'#F5B544'}}></i>Fat 22%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mini-dash" aria-hidden="true">
                <div className="md-t">CLINIC VIEW · LIVE</div>
                <div className="md-r"><i style={{background:'var(--green)'}}></i>Ravi S.<b>92%</b></div>
                <div className="md-r"><i style={{background:'var(--amber)'}}></i>Priya M.<b>61%</b></div>
                <div className="md-r"><i style={{background:'var(--green)'}}></i>Arjun K.<b>88%</b></div>
                <div className="md-r"><i style={{background:'var(--red)'}}></i>Neha T.<b>—</b></div>
              </div>
              <div className="float-chip fc1">✦ <b>Pulse AI:</b> 4 of 12 patients haven't logged today</div>
              <div className="float-chip fc2">✦ <b>Dinner idea:</b> paneer bhurji · +27 g protein</div>
            </div>
          </div>
          <div className="dash-hint reveal">HOVER / TILT — THE DASHBOARD FOLLOWS YOUR CURSOR</div>
        </div>
      </section>

      {/* FLIP CARDS */}
      <section id="features" className="flip-sec sec-light">
        <div className="aurora au-v" style={{width:520,height:520,top:-160,right:-140}} />
        <div className="aurora au-b" style={{width:440,height:440,bottom:-180,left:-120}} />
        {ecg(4)}
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">Everything inside</span>
            <h2 className="sec">Flip a card. <span className="g">Meet a feature.</span></h2>
            <p className="sub">Hover (or tap) to turn each card over.</p>
          </div>
          <div className="flips reveal">
            {[
              ['✦','AI Diet Chart','Answer <b>4 questions</b> and Pulse AI drafts a full macro-balanced day — dal, roti, paneer level detail, tuned to your condition and food preference.'],
              ['☀','Daily Insight Card','Every morning, one card: what went well yesterday and the <b>single most useful action</b> for today. No dashboards to decode.'],
              ['⚡','Smart Nudges','Nudges name the food and the grams — <b>"add 150 g paneer bhurji, +27 g protein."</b> Specific enough to act on immediately.'],
              ['💬','Pulse AI Chat','Ask anything — goal timelines, food swaps, bedtime advice. The AI already knows <b>your profile, plan and today\'s log.</b>'],
              ['📈','Full Health Log','Meals, water, 3 daily walks, weight, <b>BP and blood sugar</b> — rings, streaks and 7-day trends in one place.'],
              ['🏥','Clinic Mode','Invite patients in one email. AI drafts their plan, you refine and send. <b>Compliance badges</b> show who logged today at a glance.'],
            ].map(([ic,ttl,body],i)=>(
              <div key={i} className="flip" onClick={e=>e.currentTarget.classList.toggle('tapped')}>
                <div className="flip-in">
                  <div className="face front"><div className="ic">{ic}</div><h3>{ttl}</h3><span>Flip to see how</span></div>
                  <div className="face back"><p dangerouslySetInnerHTML={{__html: body}} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHYSICS */}
      <section className="phys" id="play">
        {ecg(12)}
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">A little gravity, because we can</span>
            <h2 className="sec">Your plate, with <span className="g">real physics.</span></h2>
            <p className="sub">Drag and throw the foods — each chip carries its real protein count. Hit 🧲 Magnet mode and the whole plate chases your cursor, Blitora-style.</p>
          </div>
          <div id="physbox" className="reveal">
            <canvas id="physcanvas"></canvas>
            <div className="phys-hint">Drag · Throw · Magnetise — live physics</div>
            <div className="phys-btns">
              <button className="btn btn-g btn-sm" onClick={()=>window._physDrop&&window._physDrop()}>+ Drop food</button>
              <button className={"btn btn-sm "+(magnetOn?'btn-v':'btn-o')} onClick={()=>setMagnetOn(o=>{const n=!o;window._magnetMode=n;if(window._physEngine)window._physEngine.gravity.y=n?0.12:1;return n;})}>🧲 Magnet {magnetOn?'ON':'mode'}</button>
              <button className="btn btn-o btn-sm" onClick={()=>window._physFlip&&window._physFlip()}>Flip gravity ⤒</button>
              <button className="btn btn-o btn-sm" onClick={()=>window._physBoom&&window._physBoom()}>💥 Explode</button>
            </div>
          </div>
        </div>
      </section>

      {/* WHO */}
      <section className="sec-light" style={{background:'linear-gradient(180deg,var(--light2),var(--light))'}}>
        <div className="aurora au-b" style={{width:500,height:500,top:-160,left:-140}} />
        <div className="aurora au-g" style={{width:440,height:440,bottom:-180,right:-120}} />
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow" style={{color:'var(--green-d)'}}>Built for three worlds</span>
            <h2 className="sec" style={{color:'var(--text-dark)'}}>One platform. <span className="g">Three ways to win.</span></h2>
          </div>
          <div className="who reveal">
            <div className="who-c">
              <div className="wic">🧘</div><h3>Individuals</h3>
              <p>Self-track with an AI companion that actually coaches you.</p>
              <ul><li>AI diet chart from 4 answers</li><li>Daily insight + smart nudges</li><li>Water, walks, weight, BP, sugar</li><li>Streaks that keep you honest</li></ul>
              <div className="trial">30-DAY FREE TRIAL · NO CARD</div>
            </div>
            <div className="who-c">
              <div className="wic">🥗</div><h3>Solo Dietitians</h3>
              <p>Manage 5–50 patients digitally instead of on WhatsApp and paper.</p>
              <ul><li>Invite patients by email</li><li>AI drafts the plan — you refine</li><li>See any patient's day, any date</li><li>Send notes and plan updates</li></ul>
              <div className="trial">14-DAY FREE TRIAL · FULL ACCESS</div>
            </div>
            <div className="who-c">
              <div className="wic">🏥</div><h3>Clinics &amp; Hospitals</h3>
              <p>Multi-dietitian teams with org-level control and reporting.</p>
              <ul><li>Assign patients to dietitians</li><li>Compliance dashboard, live</li><li>Org-wide reports &amp; export</li><li>Role-based access built in</li></ul>
              <div className="trial">14-DAY FREE TRIAL · TEAM READY</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING — real live numbers */}
      <section id="pricing" className="sec-light" style={{background:'linear-gradient(180deg,var(--light),var(--light2))'}}>
        <div className="aurora au-g" style={{width:560,height:560,top:-200,right:-160}} />
        <div className="aurora au-v" style={{width:480,height:480,bottom:-200,left:-140}} />
        {ecg(7)}
        <div className="wrap" style={{textAlign:'center'}}>
          <div className="reveal">
            <span className="eyebrow" style={{justifyContent:'center',color:'var(--green-d)'}}>Simple pricing</span>
            <h2 className="sec" style={{color:'var(--text-dark)'}}>Start free. <span className="g">Upgrade when it earns it.</span></h2>
            <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginTop:22}}>
              <div className="cur-tog">
                <button className={aud==='ind'?'on':''} onClick={()=>setAud('ind')}>🧘 Individuals</button>
                <button className={aud==='cli'?'on':''} onClick={()=>setAud('cli')}>🏥 Dietitians &amp; Clinics</button>
              </div>
              <div className="cur-tog">
                <button className={bill==='m'?'on':''} onClick={()=>setBill('m')}>Monthly</button>
                <button className={bill==='a'?'on':''} onClick={()=>setBill('a')}>Annually <span className="savechip">SAVE 18%</span></button>
              </div>
              {isIndia && <div className="cur-tog">
                <button className={cur==='inr'?'on':''} onClick={()=>setCur('inr')}>₹ INR</button>
                <button className={cur==='usd'?'on':''} onClick={()=>setCur('usd')}>$ USD</button>
              </div>}
            </div>
          </div>
          <div className="plans reveal" style={{textAlign:'left'}}>
            {currentPlans.map(p=>(
              <div key={p.name} className={"plan magcard"+(p.hot?' hot':'')}>
                {p.hot && <span className="best">MOST POPULAR</span>}
                {p.badge && <span className="plan-badge">{p.badge}</span>}
                <h4>{p.name}</h4>
                <div className="pw">{p.sub}</div>
                <div className="price"><span>{priceFor(p)}</span><small>/mo</small></div>
                <div className="billed">{billedTxt}</div>
                {p.intro && <p className="plan-sub"><b>{p.intro}</b></p>}
                <ul>
                  {p.features.map((f,i)=><li key={i} dangerouslySetInnerHTML={{__html: f}} />)}
                </ul>
                <a className={"btn magnet "+(p.ctaStyle==='g'?'btn-g':'btn-o')} href={p.ctaHref}>{p.cta}</a>
                <p className="pricenote">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="pnote">{noteCurrency} Free trial on Starter plans only · Individual: 30 days · Clinic: 14 days. Billed via Razorpay. Cancel anytime.</p>
        </div>
      </section>

      {/* BROCHURES + VIDEO */}
      <section>
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">Take Pulse with you</span>
            <h2 className="sec">Read it later. <span className="g">Watch it now.</span></h2>
            <p className="sub">Three lead-gated PDFs and a 90-second product tour.</p>
          </div>
          <div className="bro reveal">
            {BROCHURES.map((b,i)=>(
              <div key={i} className={"bro-c "+(b.kind||'')}>
                <div className="bro-ic">📄</div>
                <div className="bro-meta" style={{marginTop:12}}>{b.meta}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
                <button className={"btn magnet "+(i===1?'btn-g':'btn-o')} onClick={()=>setBroOpen(b)}>↓ Download PDF</button>
              </div>
            ))}
          </div>
          <div style={{marginTop:32}} className="reveal">
            <div className="bro-c vid" style={{textAlign:'center',padding:'46px 30px'}}>
              <div className="play magnet" role="button" aria-label="Watch video" onClick={()=>setVidOpen(true)}>▶</div>
              <h3 style={{fontSize:22}}>Watch the 90-second tour</h3>
              <p style={{margin:'0 auto 22px'}}>See the AI diet chart, the daily insight card and clinic mode — in less time than it takes to boil water.</p>
              <button className="btn btn-v magnet" onClick={()=>setVidOpen(true)}>▶ Watch video</button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="sec-light" style={{background:'linear-gradient(180deg,var(--light2),var(--light))'}}>
        <div className="aurora au-g" style={{width:500,height:500,top:-160,right:-140}} />
        <div className="aurora au-v" style={{width:440,height:440,bottom:-180,left:-120}} />
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow" style={{color:'var(--green-d)'}}>Talk to a human</span>
            <h2 className="sec" style={{color:'var(--text-dark)'}}>Questions? <span className="g">WhatsApp us.</span></h2>
            <p className="sub" style={{color:'#3D4F70'}}>Fill this in and it opens WhatsApp with your message ready — we reply the same day.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      </main>

      {/* FINAL CTA */}
      <section className="final">
        <HeroLine seed="B"/>
        <div className="wrap">
          <div className="reveal">
            <h2>Your first AI diet chart is<br/><span style={{background:'linear-gradient(92deg,var(--green),var(--violet))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>3 minutes away.</span></h2>
            <p className="sub" style={{margin:'0 auto 34px'}}>Sign up in under a minute. No credit card. Cancel anytime.</p>
            <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
              <a className="btn btn-g magnet" href="/signup" style={{padding:'18px 40px',fontSize:17}}>Start free trial →</a>
              <button className="btn btn-o magnet" onClick={()=>setBroOpen(BROCHURES[0])} style={{padding:'18px 40px',fontSize:17}}>↓ Brochure</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="f-grid">
            <div>
              <div className="logo" style={{marginBottom:16}}>
                <div className="logo-mark"><LogoSVG/></div>
                <div><span className="logo-word">BLITORA <em>PULSE</em></span><span className="logo-tag">Health Made Intelligent.</span></div>
              </div>
              <p style={{fontSize:13,color:'var(--muted)',maxWidth:300}}>AI-powered health tracking and patient management for individuals, dietitians and clinics across India and the Gulf.</p>
            </div>
            <div><h5>Product</h5><a href="#ai">Pulse AI</a><a href="#dash">Dashboard</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div>
            <div><h5>Company</h5><a href="https://blitora.com" target="_blank" rel="noreferrer">Blitora</a><a href="https://blitora.com/products" target="_blank" rel="noreferrer">All products</a><a href="#contact">Contact</a></div>
            <div><h5>Get started</h5><a href="/signup">Sign up free</a><a href="/login">Log in</a><a href="#" onClick={e=>{e.preventDefault();setBroOpen(BROCHURES[0]);}}>Brochure</a></div>
          </div>
          <div className="f-bot">
            <span>© 2026 Blitora Technologies. All rights reserved.</span>
            <span className="parent">A product of <a href="https://blitora.com" target="_blank" rel="noreferrer">BLITORA</a> — Powering Progress.</span>
          </div>
        </div>
      </footer>

      {/* BROCHURE MODAL (lead capture) */}
      {broOpen && <BroModal doc={broOpen} onClose={()=>setBroOpen(null)} />}

      {/* VIDEO MODAL */}
      {vidOpen && (
        <div className="modal open" role="dialog" aria-modal="true">
          <div className="m-bg" onClick={()=>setVidOpen(false)}></div>
          <div className="m-card wide">
            <button className="m-x" onClick={()=>setVidOpen(false)} aria-label="Close" style={{zIndex:5}}>✕</button>
            <div className="vid-box">
              <div>
                <div className="play">▶</div>
                <h3>Product tour — 90 seconds</h3>
                <p>Video coming at launch. In the meantime, try the AI diet chart demo above — it&apos;s live.</p>
                <a className="btn btn-g magnet" href="/signup" style={{marginTop:22}}>Or just try it live →</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHATBOT */}
      <ChatBot open={chatOpen} setOpen={setChatOpen} />
    </>
  );
}

/* ────── CHATBOT ────── */
function ChatBot({ open, setOpen }){
  const [msgs, setMsgs] = useState([{who:'bot',text:"Hi! 👋 I'm the Pulse Assistant. Ask me about features, pricing or trials — or tap a question below."}]);
  const [val, setVal] = useState('');
  const bodyRef = useRef(null);
  useEffect(()=>{if(bodyRef.current)bodyRef.current.scrollTop=bodyRef.current.scrollHeight;},[msgs]);
  const ask=q=>{q=(q||'').trim();if(!q)return;
    setMsgs(m=>[...m,{who:'me',text:q}]);
    setTimeout(()=>{const a=BOT_ANSWERS.find(b=>b[0].test(q))[1];setMsgs(m=>[...m,{who:'bot',text:a}]);},600);
    setVal('');
  };
  return <>
    <button id="chatFab" onClick={()=>setOpen(o=>!o)} aria-label="Chat with Pulse Assistant">✦</button>
    <div id="chatBox" className={open?'open':''}>
      <div className="cb-head">
        <div className="p-orb" style={{width:34,height:34}}></div>
        <div><b>Pulse Assistant</b><span>● Online — instant answers</span></div>
      </div>
      <div className="cb-body" ref={bodyRef}>
        {msgs.map((m,i)=><div key={i} className={"msg "+m.who}>{m.text}</div>)}
      </div>
      <div className="cb-chips">
        <button onClick={()=>ask('How does the AI diet chart work?')}>AI diet chart?</button>
        <button onClick={()=>ask('What does it cost?')}>Pricing?</button>
        <button onClick={()=>ask('Is there a free trial?')}>Free trial?</button>
        <button onClick={()=>ask('I run a clinic')}>For clinics?</button>
      </div>
      <div className="cb-foot">
        <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask(val);}} placeholder="Type a question…" />
        <button onClick={()=>ask(val)} aria-label="Send">➤</button>
      </div>
    </div>
  </>;
}

/* ────── CONTACT FORM ────── */
function ContactForm(){
  const [n,setN]=useState('');const [em,setEm]=useState('');const [r,setR]=useState('');const [m,setM]=useState('');
  const send=async()=>{
    if(!n.trim()||!/^\S+@\S+\.\S+$/.test(em)||!m.trim()){alert('Please fill your name, a valid email and your message.');return;}
    // Log the lead too (fire-and-forget)
    try{fetch('/api/lead-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,email:em,phone:'',document:'WhatsApp contact',source:'contact_form',message:`Role: ${r} | ${m}`})}).catch(()=>{});}catch(_){}
    const txt=`Hi Blitora Pulse 👋\nName: ${n}\nEmail: ${em}${r?'\nI am a: '+r:''}\nMessage: ${m}`;
    window.open('https://wa.me/919619990313?text='+encodeURIComponent(txt),'_blank');
  };
  return (
    <div className="cx-grid">
      <div className="cx-card reveal">
        <h3 className="cx-t">Send us a message</h3>
        <input className="inp" placeholder="Your name *" value={n} onChange={e=>setN(e.target.value)} />
        <input className="inp" type="email" placeholder="Email address *" value={em} onChange={e=>setEm(e.target.value)} />
        <input className="inp" placeholder="I am a… (individual / dietitian / clinic)" value={r} onChange={e=>setR(e.target.value)} />
        <textarea className="inp" placeholder="Your question or message *" value={m} onChange={e=>setM(e.target.value)}></textarea>
        <button className="btn wa-btn magnet" onClick={send}>💬 Send on WhatsApp</button>
        <p className="cx-note">Your email is included in the message so we can follow up properly.</p>
      </div>
      <div className="cx-side reveal">
        <div className="cx-tiles">
          <a className="cx-tile" href="https://wa.me/919619990313" target="_blank" rel="noreferrer"><span className="ti">💬</span><b>WhatsApp</b><span>+91 96199 90313</span></a>
          <a className="cx-tile" href="mailto:hello@blitora.com"><span className="ti">✉️</span><b>Email</b><span>hello@blitora.com</span></a>
          <div className="cx-tile"><span className="ti">🤖</span><b>Pulse Assistant</b><span>Bottom-right · 24/7</span></div>
          <a className="cx-tile" href="https://blitora.com" target="_blank" rel="noreferrer"><span className="ti">🏢</span><b>Blitora</b><span>blitora.com</span></a>
        </div>
        <div className="cx-stats">
          <div><b>&lt; 2 hrs</b><span>avg. reply</span></div>
          <div><b>7 days</b><span>a week</span></div>
          <div><b>EN · HI</b><span>languages</span></div>
        </div>
        <div className="cx-map" aria-hidden="true"><span>🔒 Private by design — your health data is encrypted and never sold.</span></div>
      </div>
    </div>
  );
}

/* ────── BROCHURE MODAL (lead capture then download) ────── */
function BroModal({ doc, onClose }){
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');
  const [err,setErr]=useState('');const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);
  const submit=async e=>{
    e && e.preventDefault();
    if(!name.trim()||!email.trim()){setErr('Please enter your name and email.');return;}
    if(!/^\S+@\S+\.\S+$/.test(email)){setErr('Please enter a valid email address.');return;}
    setErr('');setLoading(true);
    try{fetch('/api/lead-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,document:doc.title,source:'brochure_download'})}).catch(()=>{});}catch(_){}
    setLoading(false);setDone(true);
    setTimeout(()=>{const a=document.createElement('a');a.href=doc.file;a.download=doc.file.replace('/','');document.body.appendChild(a);a.click();a.remove();},400);
  };
  return (
    <div className="modal open" role="dialog" aria-modal="true">
      <div className="m-bg" onClick={onClose}></div>
      <div className="m-card">
        <button className="m-x" onClick={onClose} aria-label="Close">✕</button>
        {!done ? (
          <>
            <h3>📄 {doc.title}</h3>
            <p className="msub">Tell us where to send updates — your download starts immediately after.</p>
            <form onSubmit={submit}>
              <input className="inp" placeholder="Full name *" value={name} onChange={e=>setName(e.target.value)} autoFocus />
              <input className="inp" type="email" placeholder="Email address *" value={email} onChange={e=>setEmail(e.target.value)} />
              <input className="inp" placeholder="WhatsApp number (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
              {err && <p className="err">{err}</p>}
              <button type="submit" className="btn btn-g magnet" style={{width:'100%'}} disabled={loading}>{loading?'Preparing…':`↓ Download ${doc.meta}`}</button>
              <p style={{fontSize:11,color:'var(--muted2)',marginTop:12}}>We&apos;ll email you the launch pricing. No spam — one email, maybe two.</p>
            </form>
          </>
        ) : (
          <div className="ok-msg">
            <div className="okic">✓</div>
            <h3>Downloading…</h3>
            <p className="msub">Thanks <b style={{color:'var(--green)'}}>{name.split(' ')[0]}</b> — <b>{doc.title}</b> is on its way. Check your downloads folder.</p>
            <button className="btn btn-o btn-sm" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
