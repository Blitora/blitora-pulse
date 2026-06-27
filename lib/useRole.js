// lib/useRole.js
import { useState, useEffect, createContext, useContext } from 'react';
import { getSupabase } from './supabase';

const RoleContext = createContext({ role: null, orgId: null, org: null, loading: true });

export function RoleProvider({ children }) {
  const [role,    setRole]    = useState(null);
  const [orgId,   setOrgId]   = useState(null);
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    let sub;

    async function load(session) {
      if (!session) {
        setRole(null); setOrgId(null); setOrg(null); setLoading(false); return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'super_admin') {
        setRole('super_admin'); setOrgId(null); setOrg(null); setLoading(false); return;
      }

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (superAdmin) {
        setRole('super_admin'); setOrgId(null); setOrg(null); setLoading(false); return;
      }

      const { data: member } = await supabase
        .from('organisation_members')
        .select('role, org_id, organisations(id, name, plan, trial_ends_at, is_active)')
        .eq('user_id', session.user.id)
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
    }

    // Initial load only
    supabase.auth.getSession().then(({ data: { session } }) => load(session));

    // Only react to real auth events — NOT token_refreshed or initial_session
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setLoading(true);
        load(session);
      }
    });
    sub = authListener;

    return () => sub?.subscription?.unsubscribe();
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
