/**
 * Phase 10 audit rendering allowlist.
 *
 * Raw JSON metadata is never rendered. Every known action declares the exact metadata keys that may be
 * displayed, and each value is coerced to a primitive. An unknown action receives a generic label with
 * no metadata at all, so a new or historical event type can never leak private content by accident.
 *
 * Every allowlisted key is a safe identifier, enumerable state, count, or boolean. Titles, issuers,
 * filenames, URLs, note content, message content, leave reasons, addresses, coordinates, tokens,
 * sessions, and credentials are absent by construction.
 */

export const AUDIT_PAGE_SIZE = 50;

export const GENERIC_AUDIT_LABEL = "Recorded system action";

const shared = ["version", "previousVersion", "state", "previousState", "status", "count", "targetType", "targetId"] as const;

/** Per-action label plus the safe metadata keys that action may display. */
export const auditActions: Record<string, { label: string; fields: readonly string[] }> = {
  "auth.password_session.started": { label: "Signed in", fields: [] },
  "auth.password_session.refused": { label: "Sign in refused", fields: ["reason"] },
  "auth.password_session.ended": { label: "Signed out", fields: [] },
  "auth.credentials.bootstrapped": { label: "Existing-user credentials initialized", fields: ["count", "outcome"] },
  "foundation.scope_grant.created": { label: "Scope grant created", fields: [...shared, "scopeType"] },
  "foundation.scope_grant.updated": { label: "Scope grant updated", fields: [...shared, "scopeType"] },
  "employee_profile.created": { label: "Employee record created", fields: [...shared, "role"] },
  "employee_profile.self_updated": { label: "Employee self-profile updated", fields: [...shared, "fieldCount"] },
  "employee_profile.management_updated": { label: "Employee record updated by management", fields: [...shared, "fieldCount"] },
  "employee_profile.role_updated": { label: "Employee system role updated", fields: [...shared, "previousRole", "role"] },
  "employee_profile.assignments_updated": { label: "Employee designation updated", fields: [...shared] },
  "employee_skill.created": { label: "Employee skill recorded", fields: [...shared, "coverageEligible"] },
  "employee_skill.updated": { label: "Employee skill updated", fields: [...shared, "coverageEligible"] },
  "client.created": { label: "Client created", fields: [...shared] },
  "client.updated": { label: "Client updated", fields: [...shared] },
  "project.created": { label: "Project created", fields: [...shared, "clientId"] },
  "project.updated": { label: "Project updated", fields: [...shared, "clientId"] },
  "location.created": { label: "Location created", fields: [...shared, "clientId"] },
  "location.updated": { label: "Location updated", fields: [...shared, "clientId"] },
  "project_location.linked": { label: "Project location linked", fields: [...shared, "projectId", "locationId"] },
  "project_location.unlinked": { label: "Project location unlinked", fields: [...shared, "projectId", "locationId"] },
  "operational_contact.created": { label: "Operational contact added", fields: [...shared] },
  "staffing_requirement.created": { label: "Staffing requirement added", fields: [...shared, "requiredSkillId"] },
  "operational_employee_relation.created": { label: "Operational employee association added", fields: [...shared, "employeeUserId"] },
  "operational_note.created": { label: "Shared operational note added", fields: [...shared] },
  "operational_note.updated": { label: "Shared operational note edited", fields: [...shared] },
  "operational_note.revision_created": { label: "Shared note previous version preserved", fields: [...shared, "contentLength"] },
  "operational_note.archived": { label: "Shared operational note archived", fields: [...shared, "archiveReasonProvided"] },
  "management_note.created": { label: "Employee-management note created", fields: [...shared, "subjectUserId", "visibility", "authorRole", "contentLength"] },
  "management_note.archived": { label: "Employee-management note archived", fields: [...shared, "subjectUserId", "visibility", "reasonProvided"] },
  "admin_scope_grant.granted": { label: "Operational scope granted", fields: [...shared, "adminUserId", "scopeType", "scopeTargetId"] },
  "admin_scope_grant.revoked": { label: "Operational scope revoked", fields: [...shared, "adminUserId", "scopeType", "scopeTargetId"] },
  "schedule.created": { label: "Schedule period created", fields: [...shared, "month"] },
  "schedule.proposed": { label: "Schedule proposed", fields: [...shared, "month", "assignmentCount"] },
  "schedule.published": { label: "Schedule published", fields: [...shared, "month", "assignmentCount", "affectedEmployeeCount"] },
  "schedule.returned_to_draft": { label: "Schedule returned to draft", fields: [...shared, "month"] },
  "schedule_assignment.created": { label: "Schedule assignment created", fields: [...shared, "employeeUserId"] },
  "schedule_assignment.updated": { label: "Schedule assignment updated", fields: [...shared, "employeeUserId"] },
  "schedule_assignment.removed": { label: "Schedule assignment removed", fields: [...shared, "employeeUserId"] },
  "schedule_assignment.replaced": { label: "Schedule assignment employee replaced", fields: [...shared, "previousEmployeeUserId", "employeeUserId"] },
  "schedule_assignment.coverage_added": { label: "Coverage assignment added", fields: [...shared, "employeeUserId"] },
  "skill_requirement.created": { label: "Assignment skill requirement added", fields: [...shared, "requiredSkillId"] },
  "skill_requirement.archived": { label: "Assignment skill requirement archived", fields: [...shared, "requiredSkillId"] },
  "leave.submitted": { label: "Leave request submitted", fields: [...shared, "employeeUserId", "startDate", "endDate", "workingDays"] },
  "leave.requested": { label: "Leave requested", fields: [...shared, "employeeUserId", "startDate", "endDate", "workingDays", "projectedRemaining", "reasonProvided"] },
  "leave.approved": { label: "Leave approved", fields: [...shared, "employeeUserId", "workingDays", "allowance", "remaining", "scheduleImpactCount", "responseProvided"] },
  "leave.rejected": { label: "Leave rejected", fields: [...shared, "employeeUserId", "workingDays", "allowance", "remaining", "scheduleImpactCount", "responseProvided"] },
  "leave.cancelled": { label: "Leave cancelled", fields: [...shared, "employeeUserId"] },
  "leave.allowance_updated": { label: "Leave allowance updated", fields: [...shared, "employeeUserId", "allowance"] },
  "coverage.replacement_requested": { label: "Replacement requested", fields: [...shared, "intent", "requiredCount", "eligibleCount", "nomineeProvided"] },
  "coverage.replacement_approved": { label: "Replacement request approved", fields: [...shared, "intent", "selectedEmployeeUserId", "effectStatus", "effectPeriodId"] },
  "coverage.replacement_rejected": { label: "Replacement request rejected", fields: [...shared, "intent"] },
  "evidence.created": { label: "Capability evidence created", fields: [...shared, "kind", "relatedSkill", "hasExpiry", "hasFile", "hasExternalUrl"] },
  "evidence.updated": { label: "Capability evidence updated", fields: [...shared, "kind", "reviewedBeforeUpdate", "hasExpiry", "hasExternalUrl", "hasDetails"] },
  "evidence.archived": { label: "Capability evidence archived", fields: [...shared, "kind", "fileCountArchived"] },
  "evidence.file_attached": { label: "Evidence file attached", fields: [...shared, "kind", "fileVersion", "contentType", "sizeBytes", "replacedFile", "malwareScanned"] },
  "evidence.file_replaced": { label: "Evidence file replaced", fields: [...shared, "kind", "fileVersion", "contentType", "sizeBytes", "replacedFile", "malwareScanned"] },
  "evidence.file_archived": { label: "Evidence file archived", fields: [...shared, "kind", "fileVersion"] },
  "evidence.file_read_by_reviewer": { label: "Reviewer opened a private evidence file", fields: [...shared, "kind", "fileVersion", "contentType", "delivery"] },
  "evidence.reviewed": { label: "Capability evidence marked reviewed", fields: [...shared, "kind"] },
  "evidence.verified": { label: "Capability evidence verified", fields: [...shared, "kind"] },
  "evidence.verification_removed": { label: "Capability evidence verification removed", fields: [...shared, "kind"] },
  "evidence.review_reset": { label: "Capability evidence review reset after an owner change", fields: [...shared, "kind", "cause"] },
  "discussion.message_created": { label: "Discussion message posted", fields: [...shared, "parentType", "parentId", "messageId", "contentLength", "participantCount"] },
  "discussion.message_archived": { label: "Discussion message archived by its author", fields: [...shared, "parentType", "parentId", "messageId"] },
  // Phase 11 reporting: export provenance only. Row contents, employee names and file bytes are never recorded.
  "report.export.generated": { label: "Report export generated", fields: ["reportKey", "format", "from", "to", "rowCount", "outcome"] },
  "report.export.refused": { label: "Report export refused", fields: ["reportKey", "reason"] },
};

export function auditActionLabel(action: string) { return auditActions[action]?.label ?? GENERIC_AUDIT_LABEL; }

/** Coerces one allowlisted metadata value to a short display primitive; anything else is dropped. */
function displayValue(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  return null;
}

/**
 * Projects metadata through the action allowlist. Unknown actions render no metadata, and a nested
 * object, array, or null value is always dropped rather than stringified.
 */
export function auditMetadataFields(action: string, metadata: unknown): { key: string; value: string }[] {
  const allowed = auditActions[action]?.fields;
  if (!allowed || typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return [];
  const record = metadata as Record<string, unknown>;
  return allowed.flatMap((key) => {
    if (action === "auth.password_session.refused" && !["invalid_credentials", "inactive", "locked"].includes(String(record[key]))) return [];
    if (action === "auth.credentials.bootstrapped" && key === "outcome" && record[key] !== "initialized" && record[key] !== "unchanged") return [];
    const value = displayValue(record[key]);
    return value === null ? [] : [{ key, value }];
  });
}
