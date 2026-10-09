import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import type { TicketWorkspaceData } from "@/modules/tickets/types";

const mocks = vi.hoisted(() => ({
  page: vi.fn(), total: vi.fn(), unreadCount: vi.fn(), fileAccess: vi.fn(), workspace: vi.fn(),
}));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/modules/notifications/repositories", () => ({
  notificationRepository: { page: mocks.page, total: mocks.total, activeUnreadCount: mocks.unreadCount },
}));
vi.mock("@/modules/tickets/service", () => ({
  ticketService: { fileAccess: mocks.fileAccess, workspace: mocks.workspace },
}));

import { NotificationService } from "@/modules/notifications/service";
import { AppError, errors } from "@/shared/errors/app-error";

const ticketId = "6b30e710-2c01-4ffd-9156-867fd990f174";
const workspaceId = "7de0632a-6208-4b9a-9e6e-8e3f59968021";
const actor = (role: AuthenticatedActor["role"] = "EMPLOYEE"): AuthenticatedActor => ({
  id: "mock-employee-cora", displayName: "Fictional colleague", role, sessionId: "526a7f43-9887-402c-8e8f-2275f06a9962", sessionVersion: 1, authenticationMode: "mock", scopes: [],
});
const row = (relatedRecordType: string | null = "ticket", relatedRecordId: string | null = ticketId) => ({
  id: "43701cc0-661a-49fa-96a5-37e52c343bcd", eventType: "ticket.board_published", createdAt: new Date("2026-10-08T09:00:00.000Z"), readAt: null, archivedAt: null, relatedRecordType, relatedRecordId,
});
const workspace = (): TicketWorkspaceData => ({
  workspaces: [{ id: workspaceId, name: "Fictional workspace", description: null, clientId: null, projectId: null, version: 1, canManage: false, members: [] }],
  boards: [], tickets: [], people: [], clients: [], projects: [],
});

describe("current ticket authorization on notification destinations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.page.mockResolvedValue([row()]);
    mocks.total.mockResolvedValue(1);
    mocks.unreadCount.mockResolvedValue(1);
    mocks.fileAccess.mockResolvedValue({ ticketId });
    mocks.workspace.mockResolvedValue(workspace());
  });

  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const)("reauthorizes a %s ticket link through the current service boundary", async (role) => {
    const recipient = actor(role);
    const page = await new NotificationService().inbox(recipient);
    expect(mocks.fileAccess).toHaveBeenCalledWith(recipient, ticketId);
    expect(page.items[0].href).toBe(`/tickets/${ticketId}`);
    expect(page.items[0].title).toBe("Ticket board published");
    expect(page.items[0]).not.toHaveProperty("relatedRecordId");
  });

  it("does not preserve a link after membership or participation is revoked", async () => {
    const service = new NotificationService();
    expect((await service.inbox(actor())).items[0].href).toBe(`/tickets/${ticketId}`);
    mocks.fileAccess.mockRejectedValue(new AppError("FORBIDDEN", "This resource is unavailable.", 404));
    expect((await service.inbox(actor())).items[0].href).toBeNull();
    expect(mocks.fileAccess).toHaveBeenCalledTimes(2);
  });

  it.each([403, 404])("renders a neutral destination for a %s refusal", async (status) => {
    mocks.fileAccess.mockRejectedValue(new AppError("FORBIDDEN", "Private internal refusal", status));
    const page = await new NotificationService().inbox(actor());
    expect(page.items[0].href).toBeNull();
    expect(JSON.stringify(page.items)).not.toContain("Private internal refusal");
  });

  it("propagates infrastructure failures and expired identity", async () => {
    const service = new NotificationService();
    for (const error of [new Error("Fictional connection failure"), errors.database(), errors.unauthenticated()]) {
      mocks.fileAccess.mockRejectedValue(error);
      await expect(service.inbox(actor())).rejects.toBe(error);
    }
  });

  it("only links a workspace in the current authorized projection", async () => {
    mocks.page.mockResolvedValue([row("ticket_workspace", workspaceId)]);
    const service = new NotificationService();
    expect((await service.inbox(actor())).items[0].href).toBe(`/tickets?workspace=${workspaceId}`);
    mocks.workspace.mockResolvedValue({ ...workspace(), workspaces: [] });
    expect((await service.inbox(actor())).items[0].href).toBeNull();
    expect(mocks.workspace).toHaveBeenCalledTimes(2);
  });

  it("propagates a failed workspace authorization lookup", async () => {
    mocks.page.mockResolvedValue([row("ticket_workspace", workspaceId)]);
    const error = errors.database();
    mocks.workspace.mockRejectedValue(error);
    await expect(new NotificationService().inbox(actor())).rejects.toBe(error);
  });

  it("keeps missing or unsupported record identities neutral without ticket lookup", async () => {
    mocks.page.mockResolvedValue([row("ticket", null), row("unknown", ticketId)]);
    const page = await new NotificationService().inbox(actor());
    expect(page.items.map((item) => item.href)).toEqual([null, null]);
    expect(mocks.fileAccess).not.toHaveBeenCalled();
    expect(mocks.workspace).not.toHaveBeenCalled();
  });
});
