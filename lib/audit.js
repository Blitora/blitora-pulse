// lib/audit.js
// Blitora Pulse — Audit log helper
// Records every admin action: who, what, when, on what target

import { createClient } from '@supabase/supabase-js';

// Use anon key — RLS handles access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * log — records an admin action to audit_log
 * @param {string} actorId  — auth.uid() of the person performing the action
 * @param {string} action   — e.g. 'suspend_user', 'invite_patient', 'extend_trial'
 * @param {string} targetType — e.g. 'user', 'org', 'invitation'
 * @param {string} targetId   — uuid of the target record
 * @param {object} metadata   — any extra context (reason, old value, new value)
 */
export async function log(actorId, action, targetType, targetId, metadata = {}) {
  try {
    await supabase.from('audit_log').insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Audit log failures should never break the main flow
    console.error('Audit log error:', err);
  }
}

// Convenience wrappers for common actions

export const audit = {
  // User management
  suspendUser:    (actorId, userId, reason) =>
    log(actorId, 'suspend_user', 'user', userId, { reason }),

  reinstateUser:  (actorId, userId) =>
    log(actorId, 'reinstate_user', 'user', userId),

  deleteUser:     (actorId, userId, type = 'soft') =>
    log(actorId, `${type}_delete_user`, 'user', userId),

  // Org management
  extendTrial:    (actorId, orgId, newDate) =>
    log(actorId, 'extend_trial', 'org', orgId, { new_trial_ends_at: newDate }),

  suspendOrg:     (actorId, orgId, reason) =>
    log(actorId, 'suspend_org', 'org', orgId, { reason }),

  reinstateOrg:   (actorId, orgId) =>
    log(actorId, 'reinstate_org', 'org', orgId),

  // Invitations
  invitePatient:  (actorId, invitationId, email) =>
    log(actorId, 'invite_patient', 'invitation', invitationId, { email }),

  inviteDietitian:(actorId, invitationId, email) =>
    log(actorId, 'invite_dietitian', 'invitation', invitationId, { email }),

  acceptInvite:   (userId, invitationId) =>
    log(userId, 'accept_invite', 'invitation', invitationId),

  // Super admin
  addSuperAdmin:  (actorId, newAdminId) =>
    log(actorId, 'add_super_admin', 'user', newAdminId),

  removeSuperAdmin:(actorId, removedId) =>
    log(actorId, 'remove_super_admin', 'user', removedId),

  // Patient management
  assignPatient:  (actorId, patientId, dietitianId) =>
    log(actorId, 'assign_patient', 'patient_assignment', patientId, { dietitian_id: dietitianId }),

  generatePlan:   (actorId, patientId) =>
    log(actorId, 'generate_patient_plan', 'patient', patientId),

  // Data export
  exportOrgData:  (actorId, orgId) =>
    log(actorId, 'export_org_data', 'org', orgId),

  exportUserData: (actorId, userId) =>
    log(actorId, 'export_user_data', 'user', userId),
};
