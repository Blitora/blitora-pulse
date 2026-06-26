// components/RoleGuard.js
// Wrap any page with <RoleGuard allow={['patient','org_admin']}> to restrict access
// Usage:
//   export default function DashboardPage() {
//     return <RoleGuard allow={['patient']}><Dashboard /></RoleGuard>
//   }

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole, ROLES } from '../lib/useRole';

export const ROLE_HOME = {
  [ROLES.SUPER_ADMIN]: '/admin/orgs',
  [ROLES.ORG_ADMIN]:   '/clinic/patients',
  [ROLES.DIETITIAN]:   '/clinic/patients',
  [ROLES.PATIENT]:     '/dashboard',
  [ROLES.UNASSIGNED]:  '/org/setup',
};

export default function RoleGuard({ allow, children }) {
  const { role, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!role) { router.replace('/'); return; }

    const allowed = Array.isArray(allow) ? allow : [allow];
    if (!allowed.includes(role)) {
      // Redirect to their home
      router.replace(ROLE_HOME[role] || '/');
    }
  }, [role, loading, allow, router]);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F7F8FA' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:36, height:36, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}></div>
          <p style={{ fontSize:'0.8rem', color:'#6B7280' }}>Loading…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!role || !allowed.includes(role)) return null;

  return children;
}

// Export the role→home map for use in _app.js / index.js
export { ROLE_HOME };
