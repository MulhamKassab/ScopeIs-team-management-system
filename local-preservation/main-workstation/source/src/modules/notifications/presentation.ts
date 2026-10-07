/**
 * Notification rows store no display content. Every title and summary is derived from the event type,
 * and unknown or historical event types fall back to a neutral label instead of leaking raw data.
 */
const catalogue: Record<string, { title: string; summary: string }> = {
  "schedule.published": { title: "Schedule published", summary: "Your published schedule or an assignment that affects you changed." },
  "leave.submitted": { title: "Leave request submitted", summary: "A leave request is waiting for a Super Admin decision." },
  "leave.approved": { title: "Leave approved", summary: "Your leave request was approved." },
  "leave.rejected": { title: "Leave rejected", summary: "Your leave request was rejected." },
  "coverage.replacement_requested": { title: "Replacement request submitted", summary: "A coverage or replacement request needs a Super Admin decision." },
  "coverage.replacement_approved": { title: "Replacement request approved", summary: "Your replacement request was approved." },
  "coverage.replacement_rejected": { title: "Replacement request rejected", summary: "Your replacement request was rejected." },
  "evidence.created": { title: "Capability evidence added", summary: "An employee recorded new capability evidence." },
  "evidence.updated": { title: "Capability evidence updated", summary: "Capability evidence changed and may need review." },
  "evidence.reviewed": { title: "Capability evidence reviewed", summary: "Your capability evidence was marked reviewed." },
  "evidence.verified": { title: "Capability evidence verified", summary: "Your capability evidence was marked verified." },
  "evidence.verification_removed": { title: "Verification removed", summary: "Verification was removed from your capability evidence." },
  "evidence.review_reset": { title: "Review reset", summary: "Your review state was reset. Reload the record before acting." },
  "discussion.message_created": { title: "New discussion message", summary: "Another participant posted a message on your request." },
};

export function notificationText(eventType: string) {
  return catalogue[eventType] ?? { title: "Update", summary: "Open the related record for details." };
}

export const NOTIFICATION_PAGE_SIZE = 25;
