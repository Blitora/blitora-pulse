// pages/_app.js
import { RoleProvider } from '../lib/useRole';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <RoleProvider>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      </Head>
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-family: 'Poppins', Arial, sans-serif; }
        body {
          font-family: 'Poppins', Arial, sans-serif;
          background: radial-gradient(ellipse 120% 80% at 80% -10%, #122a5e 0%, #0D1B3E 45%, #070E22 100%) fixed;
          color: #ffffff;
          min-height: 100vh;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(29,158,117,.4); border-radius: 4px; }
        input, textarea, select, button { font-family: 'Poppins', Arial, sans-serif; }
        input::placeholder { color: rgba(255,255,255,.3); }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes beat    { 0%,100%{transform:scale(1)} 14%{transform:scale(1.035)} 42%{transform:scale(1.02)} }
        @keyframes ecgDraw { to { stroke-dashoffset: 0; } }
        @keyframes blink   { 50% { opacity: 0; } }
        @keyframes fadein  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes orbGlow { 0%,100%{box-shadow:0 0 55px rgba(29,158,117,.45),inset -16px -22px 45px rgba(0,0,0,.55),inset 9px 11px 36px rgba(255,255,255,.18)} 50%{box-shadow:0 0 90px rgba(42,232,164,.65),inset -16px -22px 45px rgba(0,0,0,.5),inset 9px 11px 36px rgba(255,255,255,.25)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dropIn  { 0%{transform:scale(.6)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes tiltIn  { from{opacity:0;transform:rotateY(-6deg) translateY(12px)} to{opacity:1;transform:none} }
        .glass-card {
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          backdrop-filter: blur(16px);
        }
      `}</style>
      <Component {...pageProps} />
    </RoleProvider>
  );
}
