// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
// The server actions are the only edge to the database in these panels; mocking them keeps the
// component suite a genuine UI test with no PostgreSQL and no environment configuration.
vi.mock("@/modules/notifications/actions", () => {
  const action = async () => ({});
  return { archiveNotificationAction: action, markAllNotificationsReadAction: action, setNotificationReadAction: action };
});
vi.mock("@/modules/notes/actions", () => {
  const action = async () => ({});
  return { archiveManagementNoteAction: action, createManagementNoteAction: action };
});
vi.mock("@/modules/discussions/actions", () => {
  const action = async () => ({});
  return { archiveDiscussionMessageAction: action, postDiscussionMessageAction: action };
});

import { DiscussionPanel } from "@/modules/discussions/forms";
import type { DiscussionThreadView } from "@/modules/discussions/service";
import { ManagementNotePanel } from "@/modules/notes/forms";
import type { ManagementNoteView } from "@/modules/notes/service";
import { NotificationCentre } from "@/modules/notifications/forms";
import type { NotificationPage } from "@/modules/notifications/service";

const evidenceId = "10000000-0000-4000-8000-000000000001";
const noteId = "20000000-0000-4000-8000-000000000002";
const messageId = "30000000-0000-4000-8000-000000000003";

const page: NotificationPage = {
  filter: "all", page: 1, pageSize: 25, total: 2, totalPages: 1, hasNext: false, hasPrevious: false, unreadCount: 1,
  items: [
    { id: evidenceId, eventType: "evidence.updated", title: "Capability evidence updated", summary: "Capability evidence changed and may need review.", createdAt: "2026-06-01T09:00:00.000Z", isRead: false, isArchived: false, relatedRecordType: "employee_evidence", href: `/employees/mock-employee-cora#evidence-${evidenceId}` },
    { id: noteId, eventType: "unmapped.event", title: "Update", summary: "Open the related record for details.", createdAt: "2026-06-02T09:00:00.000Z", isRead: true, isArchived: true, relatedRecordType: "unsupported_record", href: null },
  ],
};

const note = (overrides: Partial<ManagementNoteView> = {}): ManagementNoteView => ({
  id: noteId, subjectUserId: "mock-employee-cora", visibility: "private_to_author", content: "Fictional private supervision note",
  authorRole: "ADMIN", authorName: "Ava Mercer", isAuthor: true, canArchive: true, version: 2,
  createdAt: "2026-06-01T09:00:00.000Z", archivedAt: null, ...overrides,
});

const thread: DiscussionThreadView = {
  requestId: "40000000-0000-4000-8000-000000000004", threadId: "50000000-0000-4000-8000-000000000005", intent: "ADD_COVERAGE_ASSIGNMENT", status: "PENDING",
  participants: { requesterUserId: "mock-admin-ava", nominatedEmployeeUserId: "phase4-employee-alpha", selectedEmployeeUserId: null },
  lastMessageAt: "2026-06-01T09:00:00.000Z",
  messages: [
    { id: messageId, authorUserId: "mock-admin-ava", authorName: "Ava Mercer", content: "Fictional replacement coordination message", isAuthor: true, version: 1, createdAt: "2026-06-01T09:00:00.000Z", archivedAt: null },
    { id: evidenceId, authorUserId: "phase4-employee-alpha", authorName: "Eli Alpha", content: "Fictional acknowledgement", isAuthor: false, version: 1, createdAt: "2026-06-01T10:00:00.000Z", archivedAt: null },
  ],
};

describe("Phase 10 notification centre", () => {
  it("renders the inbox, keeps read and archive visible as separate signals, and links only authorized destinations", () => {
    render(<NotificationCentre view={page} filter="all" />);
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText(/1 unread notification\./)).toBeInTheDocument();
    // Colour is never the only signal: the read/archive state is textual.
    expect(screen.getByText(/^Unread · 2026-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/^Read · Archived · 2026-06-02/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open related record" })).toHaveAttribute("href", `/employees/mock-employee-cora#evidence-${evidenceId}`);
    // An unsupported or inaccessible target renders the neutral unavailable state, not a broken link.
    expect(screen.getByText(/no available destination/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open related record" })).toHaveLength(1);
  });

  it("exposes independent read, unread, archive, and restore controls plus recipient-scoped filter navigation", () => {
    render(<NotificationCentre view={page} filter="all" />);
    expect(screen.getByRole("form", { name: "Mark all notifications read" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Mark this notification unread" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Mark this notification read" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Archive this notification" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Restore this notification" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Notification filters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Archived" })).toHaveAttribute("href", "/notifications?filter=archived");
    expect(screen.getByRole("navigation", { name: "Notification pages" })).toHaveTextContent("Page 1 of 1");
  });

  it("offers next-page navigation when more than one page exists", () => {
    render(<NotificationCentre view={{ ...page, page: 1, totalPages: 3, total: 60, hasNext: true }} filter="all" />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/notifications?filter=all&page=2");
    expect(screen.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
  });
});

describe("Phase 10 employee-management notes panel", () => {
  it("renders an author's private and shared notes with an explicit visibility label", () => {
    render(<ManagementNotePanel subjectUserId="mock-employee-cora" subjectName="Cora Bell" notes={[note(), note({ id: evidenceId, visibility: "shared_upward", content: "Fictional shared-upward supervision note" })]} canCreate />);
    expect(screen.getByRole("heading", { name: "Management notes" })).toBeInTheDocument();
    expect(screen.getByText("Fictional private supervision note")).toBeInTheDocument();
    expect(screen.getByText("Fictional shared-upward supervision note")).toBeInTheDocument();
    // The visibility label must be attached to the note it describes, not merely present somewhere.
    expect(screen.getByText("Fictional private supervision note").closest("article")).toHaveTextContent("Private to author");
    expect(screen.getByText("Fictional shared-upward supervision note").closest("article")).toHaveTextContent("Shared upward");
    expect(screen.getByRole("form", { name: "Add management note about Cora Bell" })).toBeInTheDocument();
  });

  it("hides creation and archiving controls when the actor may only read the notes they can see", () => {
    render(<ManagementNotePanel subjectUserId="mock-employee-cora" subjectName="Cora Bell" notes={[note({ isAuthor: false, canArchive: false, visibility: "shared_upward" })]} canCreate={false} />);
    expect(screen.queryByRole("form", { name: "Add management note about Cora Bell" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: /Archive note from/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Your note")).not.toBeInTheDocument();
  });

  it("renders an empty state instead of leaking that other notes exist", () => {
    render(<ManagementNotePanel subjectUserId="mock-employee-cora" subjectName="Cora Bell" notes={[]} canCreate />);
    expect(screen.getByText(/No management note is visible to you for this employee/)).toBeInTheDocument();
  });
});

describe("Phase 10 replacement-request discussion panel", () => {
  it("renders messages in order with an author-only archive control and a composer", () => {
    render(<DiscussionPanel thread={thread} heading="Discussion · Add coverage assignment (PENDING)" />);
    expect(screen.getByRole("heading", { name: /Discussion · Add coverage assignment/ })).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getAllByText(/Fictional/).map((node) => node.textContent)).toEqual(["Fictional replacement coordination message", "Fictional acknowledgement"]);
    // Only the author may archive, and no participant is offered editing.
    expect(screen.getAllByRole("form", { name: /Archive your message/ })).toHaveLength(1);
    expect(screen.queryByRole("textbox", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: /Post a message in/ })).toBeInTheDocument();
  });

  it("renders an empty discussion state for a thread with no visible messages", () => {
    render(<DiscussionPanel thread={{ ...thread, messages: [] }} heading="Request · Add coverage assignment (PENDING)" />);
    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
  });
});

describe("Phase 10 component boundary", () => {
  it("keeps the collaboration UI independent of the database-backed service modules", async () => {
    // The panels render from mocked actions only; the DB-backed service modules must stay unimportable here.
    await expect(import("@/modules/notifications/service")).rejects.toThrow();
    expect(process.env.DATABASE_URL).toBeUndefined();
    render(<NotificationCentre view={page} filter="all" />);
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});
