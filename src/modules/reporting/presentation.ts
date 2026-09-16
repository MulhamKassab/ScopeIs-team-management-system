import { UNAVAILABLE_SOURCE_STATE } from "@/modules/reporting/definitions";

/**
 * User-facing copy for reporting. Kept separate from the metric contracts so the wording can be reviewed
 * on its own, and so the terminology tests can assert against one list rather than scattered strings.
 */

export const REPORTING_TIMEZONE_LABEL = "Asia/Dubai";

/** Shown when a required reporting source is genuinely missing. Never used to describe a person. */
export function missingSourceLabel(source: string) { return `${UNAVAILABLE_SOURCE_STATE}: ${source}`; }

export const zeroStateNote = "0 means the authorized scope genuinely contains no matching rows.";

export function asOfLabel(asOf: string) { return `As of ${asOf} (${REPORTING_TIMEZONE_LABEL})`; }

export function planningBanner() {
  return "PLANNING (unpublished) — this report contains Draft and Proposed scheduling only, and is never combined with Published allocation.";
}

export function exportRefusalCopy(message: string) { return message; }

export const reportIndexIntro = "Every report names its source, its grain and its scope rule. Counts and rows are recalculated from your current authorization on each request.";

export const dashboardIntro = "Operational summaries read the current Published schedule. Draft and Proposed scheduling is reported separately and never blended into a published figure.";
