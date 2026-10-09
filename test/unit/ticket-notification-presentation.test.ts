import { describe, expect, it } from "vitest";
import { auditActionLabel, auditActions, auditMetadataFields, GENERIC_AUDIT_LABEL } from "@/modules/audit/presentation";
import { notificationText } from "@/modules/notifications/presentation";

const id = "6b30e710-2c01-4ffd-9156-867fd990f174";
const privateMetadata = {
  subject: "Private customer work", summary: "Private summary", planning: "Private planning",
  workCompleted: "Private work", notes: "Private note", onHoldReason: "Private reason",
  description: "Private log", fileName: "private-customer.pdf", storageKey: "private/bucket/key",
  url: "https://private.example/file", name: "Private workspace", password: "Private password",
};

describe("ticket notification and audit presentation", () => {
  it("describes every emitted event without record content", () => {
    const events = ["created", "updated", "participants_updated", "work_log_created", "work_log_updated", "archived", "restored", "board_published", "file_created", "file_archived", "file_restored"];
    for (const event of events) {
      const text = notificationText(`ticket.${event}`);
      expect(text.title).not.toBe("Update");
      expect(text.summary.length).toBeGreaterThan(0);
      expect(JSON.stringify(text)).not.toContain(privateMetadata.subject);
    }
    expect(notificationText("ticket.future.Private customer work")).toEqual({ title: "Update", summary: "Open the related record for details." });
  });

  it("allows only the safe metadata declared for each ticket action", () => {
    const safe = { linked: true, userId: "mock-employee-cora", workspaceId: id, boardId: id, workLogId: id, fileId: id, status: "OPEN", participantCount: 2, contentType: "application/pdf", byteSize: 42, version: 3, fileVersion: 2 };
    const actions = Object.keys(auditActions).filter((action) => action.startsWith("ticket."));
    expect(actions).toHaveLength(16);
    for (const action of actions) {
      expect(auditActionLabel(action)).not.toBe(GENERIC_AUDIT_LABEL);
      const metadata = { ...safe, ...privateMetadata, status: action.startsWith("ticket.board_") ? "PUBLISHED" : "OPEN" };
      const fields = auditMetadataFields(action, metadata);
      expect(fields.map((field) => field.key)).toEqual(auditActions[action].fields);
      expect(fields.some((field) => Object.hasOwn(privateMetadata, field.key))).toBe(false);
      expect(JSON.stringify(fields)).not.toContain("Private");
      expect(JSON.stringify(fields)).not.toContain("private/");
    }
    expect(auditMetadataFields("ticket.future", { ...safe, ...privateMetadata })).toEqual([]);
  });

  it("refuses content hidden in identifier, enum, count or file-type fields", () => {
    expect(auditMetadataFields("ticket.created", { boardId: "Private content", status: "Private content", participantCount: "Private content" })).toEqual([]);
    expect(auditMetadataFields("ticket.board_created", { workspaceId: privateMetadata.url, status: "OPEN" })).toEqual([]);
    expect(auditMetadataFields("ticket.file_created", { fileId: "private.pdf", contentType: "text/html", byteSize: -1, version: Number.POSITIVE_INFINITY })).toEqual([]);
    expect(auditMetadataFields("ticket.file_restored", { fileId: { id }, fileVersion: [2], version: null })).toEqual([]);
    expect(auditMetadataFields("ticket.member_granted", { userId: "Private customer name" })).toEqual([]);
    expect(auditMetadataFields("ticket.workspace_created", { linked: "Private content" })).toEqual([]);
  });
});
