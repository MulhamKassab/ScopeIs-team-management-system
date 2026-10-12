import { describe, expect, it } from "vitest";
import { readTicketFilters, safeTicketReturnTo, ticketContainerHref, ticketDetailHref, ticketWorkspaceHref } from "@/modules/tickets/navigation";

describe("ticket navigation context", () => {
  it.each([
    "https://example.com/tickets?search=reader", "//example.com/tickets", "/tickets\\example.com", "/tickets/123", "/tickets-other", "/tickets%2f123", "/tickets#anchor", "/tickets?search=reader\n", "/tickets?search=reader\u0000",
  ])("uses the ticket-list fallback for unsafe return value %j", (value) => {
    expect(safeTicketReturnTo(value)).toBe("/tickets");
  });

  it("preserves only validated public presentation state", () => {
    const value = "/tickets?view=archive&layout=board&workspace=company-1&board=support-2&search=access+reader&status=ON_HOLD&priority=HIGH&relation=mentioned&from=https%3A%2F%2Fexample.com&token=secret";
    const safe = safeTicketReturnTo(value);
    expect(Object.fromEntries(new URL(safe, "https://scopeis.invalid").searchParams)).toEqual({
      view: "archive", layout: "board", workspace: "company-1", board: "support-2", search: "access reader", status: "ON_HOLD", priority: "HIGH", relation: "mentioned",
    });
    expect(safe).not.toContain("example.com");
    expect(safe).not.toContain("secret");
  });

  it("normalizes defaults, invalid enum values and unsafe container identifiers", () => {
    expect(safeTicketReturnTo("/tickets?view=unknown&layout=canvas&workspace=../outside&board=bad%2Fpath&relation=all&status=hidden&priority=urgent&from=%2Fprofile")).toBe("/tickets");
    expect(readTicketFilters()).toMatchObject({ view: "tickets", layout: "list", relation: "all", workspace: "", board: "" });
    expect(ticketWorkspaceHref(readTicketFilters())).toBe("/tickets");
  });

  it("uses the last duplicate allowed value and bounds search state", () => {
    expect(safeTicketReturnTo("/tickets?relation=created&relation=assigned&view=overview&view=tickets")).toBe("/tickets?relation=assigned");
    expect(readTicketFilters({ search: `\n${"x".repeat(250)}\u0000` }).search).toHaveLength(200);
    expect(safeTicketReturnTo(`/tickets?search=${"x".repeat(2000)}`)).toBe("/tickets");
  });

  it("builds detail and container links without losing unrelated filters", () => {
    const context = "/tickets?layout=board&search=reader&relation=assigned&priority=HIGH";
    const detail = new URL(ticketDetailHref("ticket-123", context), "https://scopeis.invalid");
    expect(detail.pathname).toBe("/tickets/ticket-123");
    expect(Object.fromEntries(new URL(detail.searchParams.get("from")!, "https://scopeis.invalid").searchParams)).toEqual({ layout: "board", search: "reader", relation: "assigned", priority: "HIGH" });
    const container = new URL(ticketContainerHref(context, { view: "tickets", workspace: "company", board: "support" }), "https://scopeis.invalid");
    expect(Object.fromEntries(container.searchParams)).toEqual({ layout: "board", workspace: "company", board: "support", search: "reader", priority: "HIGH", relation: "assigned" });
  });
});
