// components/RoleGuard.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole, ROLES } from '../lib/useRole';

export const ROLE_HOME = {
    [ROLES.SUPER_ADMIN]: '/admin/orgs',
    [ROLES.ORG_ADMIN]:   '/clinic/patients',
    [ROLES.DIETITIAN]:   '/clinic/patients',
    [ROLES.PATIENT]:     '/dashboard',
    [ROLES.UNASSIGNED]:  '/dashboard',   // individual users land here, setup guards its own flow
};

export default function RoleGuard({ allow, children }) {
    const router = useRouter();
    const { role, loading } = useRole();

    useEffect(() => {
        if (loading) return;
        if (!role) { router.replace('/login'); return; }
        if (allow && !allow.includes(role)) {
            router.replace(ROLE_HOME[role] || '/dashboard');
        }
    }, [role, loading, allow, router]);

    if (loading) return null;
    if (!role) return null;
    if (allow && !allow.includes(role)) return null;
    return children;
}
