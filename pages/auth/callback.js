// pages/auth/callback.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
    const router = useRouter();

  useEffect(() => {
        router.replace('/');
  }, [router]);

  return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
        <p style={{ fontSize:14, color:'#6B7280' }}>Signing you in...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
  </div>
  );
}
