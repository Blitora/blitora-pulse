// lib/useRole.js
// Returns the current user's role and org_id from organisation_members
// Usage: const { role, orgId, loading } = useRole()

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabase';

const RoleContext = createContext({ role: null, orgId: null, org: null, loading: true });

export function RoleProvider({ children }) {
  const [role, setRole]   = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [org, setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub;

    async function load(session) {
      if (!session) { setRole(null); setOrgId(null); setOrg(null); setLoading(false); return; }

      // Check super_admin from profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'super_admin') {
        setRole('super_admin');
        setOrgId(null);
        setOrg(null);
        setLoading(false);
        return;
      }

      // Get org membership
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
        setRole('unassigned'); // logged in but no org yet
        setOrgId(null);
        setOrg(null);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => load(session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      load(session);
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

// Convenience helpers
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
