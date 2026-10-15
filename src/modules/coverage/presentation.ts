export function coverRequestLabel(request: { status: string; decidedByUserId: string | null; effectPeriodStatus?: string | null }) {
  if (request.status === "PENDING") return "Awaiting decision";
  if (request.status === "APPROVED") {
    if (request.effectPeriodStatus === "PUBLISHED") return "Schedule published";
    return ["DRAFT", "PROPOSED"].includes(request.effectPeriodStatus ?? "") ? "Draft prepared" : "Approved";
  }
  return request.decidedByUserId ? "Rejected" : "Cancelled";
}
