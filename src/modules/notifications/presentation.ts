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
  "ticket.created": { title: "Ticket created", summary: "A ticket was created." },
  "ticket.updated": { title: "Ticket updated", summary: "A ticket changed." },
  "ticket.participants_updated": { title: "Ticket people updated", summary: "The people with access to a ticket changed." },
  "ticket.work_log_created": { title: "Ticket work recorded", summary: "A work log was added to a ticket." },
  "ticket.work_log_updated": { title: "Ticket work log updated", summary: "A work log on a ticket changed." },
  "ticket.archived": { title: "Ticket archived", summary: "A ticket was archived with its history retained." },
  "ticket.restored": { title: "Ticket restored", summary: "An archived ticket was restored." },
  "ticket.board_published": { title: "Ticket board published", summary: "A ticket board was published." },
  "ticket.file_created": { title: "Private ticket file attached", summary: "A private file was attached to a ticket." },
  "ticket.file_archived": { title: "Private ticket file archived", summary: "A private ticket file was archived with its history retained." },
  "ticket.file_restored": { title: "Private ticket file restored", summary: "An archived private ticket file was restored." },
};

export function notificationText(eventType: string) {
  return catalogue[eventType] ?? { title: "Update", summary: "Open the related record for details." };
}

export const NOTIFICATION_PAGE_SIZE = 25;
