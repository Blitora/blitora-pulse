// lib/useRole.js
import { useState, useEffect, createContext, useContext } from 'react';
import { getSupabase } from './supabase';

const RoleContext = createContext({ role: null, orgId: null, org: null, loading: true });

export function RoleProvider({ children }) {
  const [role,    setRole]    = useState(null);
  const [orgId,   setOrgId]   = useState(null);
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    async function load(userId) {
      if (!userId) {
        setRole(null); setOrgId(null); setOrg(null);
        setLoading(false); setLoaded(true); return;
      }

      // Check super_admins table first
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (superAdmin) {
        setRole('super_admin'); setOrgId(null); setOrg(null);
        setLoading(false); setLoaded(true); return;
      }

      // Get org membership
      const { data: member } = await supabase
        .from('organisation_members')
        .select('role, org_id, organisations(id, name, plan, trial_ends_at, is_active)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      if (member) {
        setRole(member.role);
        setOrgId(member.org_id);
        setOrg(member.organisations);
      } else {
        setRole('unassigned');
        setOrgId(null);
        setOrg(null);
      }
      setLoading(false);
      setLoaded(true);
    }

    // Run once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      load(session?.user?.id || null);
    });

    // Only react to SIGNED_OUT — do not re-run on SIGNED_IN or token refresh
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setRole(null); setOrgId(null); setOrg(null);
        setLoading(false); setLoaded(true);
      }
      if (event === 'SIGNED_IN' && !loaded) {
        load(session?.user?.id || null);
      }
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  return (
    <RoleContext.Provider value={{ role, orgId, org, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN:   'org_admin',
  DIETITIAN:   'dietitian',
  PATIENT:     'patient',
  UNASSIGNED:  'unassigned',
};

export function isClinicRole(role) {
  return role === ROLES.ORG_ADMIN || role === ROLES.DIETITIAN;
}
