import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, clients, employeeProfiles, locations, operationalContacts, operationalEmployeeRelations, operationalNotes, projectLocations, projects, skills, staffingRequirements, users } from "@/db/schema";
import { OperationalService, operationalService } from "@/modules/operations/service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

function actor(id: string, role: AuthenticatedActor["role"]): AuthenticatedActor { return { id, role, displayName: id, sessionId: `session-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" }; }
const personas = {
  nora: actor("mock-super-admin-nora", "SUPER_ADMIN"), ava: actor("mock-admin-ava", "ADMIN"), ben: actor("mock-admin-ben", "ADMIN"),
  unscoped: actor("phase3-admin-unscoped", "ADMIN"), projectAdmin: actor("phase3-admin-project", "ADMIN"), locationAdmin: actor("phase3-admin-location", "ADMIN"),
  implicitAdmin: actor("phase3-admin-implicit", "ADMIN"), cora: actor("mock-employee-cora", "EMPLOYEE"),
};

beforeAll(async () => {
  await db.insert(users).values([
    { id: personas.unscoped.id, displayName: "Una Scoped", role: "ADMIN" }, { id: personas.projectAdmin.id, displayName: "Priya Project", role: "ADMIN" },
    { id: personas.locationAdmin.id, displayName: "Lina Location", role: "ADMIN" }, { id: personas.implicitAdmin.id, displayName: "Iris Implicit", role: "ADMIN" },
  ]);
  const profileUsers = [personas.nora.id, personas.ava.id, personas.ben.id, personas.unscoped.id, personas.projectAdmin.id, personas.locationAdmin.id, personas.implicitAdmin.id, personas.cora.id];
  await db.insert(employeeProfiles).values(profileUsers.map((userId, index) => ({ userId, employeeCode: `P3-${String(index + 1).padStart(3, "0")}`, team: userId === personas.implicitAdmin.id ? "team:alpha" : null })));
});

async function root(name = `Client ${randomUUID()}`) { return operationalService.createClient(personas.nora, { companyName: name }); }
async function grant(adminUserId: string, type: "CLIENT" | "PROJECT" | "LOCATION", reference: string) { return db.insert(adminScopeGrants).values({ userId: adminUserId, scopeType: type, scopeReference: reference }).returning().then(([row]) => row!); }

describe("Phase 3 operational service", () => {
  it("completes Client → Project → new/reused same-client Location with separate queryable records and safe audit", async () => {
    const client = await operationalService.createClient(personas.nora, { companyName: `Acme Fictional ${randomUUID()}`, accountManagerUserId: personas.ava.id, serviceSummary: "Sensitive service summary" });
    const first = await operationalService.createProject(personas.nora, { clientId: client.id, name: "Harbor rollout", status: "ACTIVE", responsibleAdminUserId: personas.ava.id });
    const second = await operationalService.createProject(personas.nora, { clientId: client.id, name: "Harbor support", status: "PLANNED" });
    const location = await operationalService.createLocation(personas.nora, { clientId: client.id, name: "Harbor Site", address: "44 Fictional Port Road", latitude: 25.2, longitude: 55.3, accessInstructions: "Sensitive gate detail" });
    const linkOne = await operationalService.linkProjectLocation(personas.nora, { projectId: first.id, locationId: location.id });
    const linkTwo = await operationalService.linkProjectLocation(personas.nora, { projectId: second.id, locationId: location.id });
    await operationalService.unlinkProjectLocation(personas.nora, first.id, location.id, linkOne.version);
    const relinked = await operationalService.linkProjectLocation(personas.nora, { projectId: first.id, locationId: location.id });
    expect(relinked.archivedAt).toBeNull();
    expect(linkOne.locationId).toBe(linkTwo.locationId); expect(await db.select().from(locations).where(eq(locations.clientId, client.id))).toHaveLength(1);
    expect(await db.select().from(projectLocations).where(eq(projectLocations.locationId, location.id))).toHaveLength(2);
    const skill = await db.insert(skills).values({ name: `Phase3 skill ${randomUUID()}` }).returning().then(([row]) => row!);
    await operationalService.addContact(personas.nora, { type: "CLIENT", id: client.id, name: "Operations Desk", workEmail: "ops@example.test" });
    await operationalService.addRequirement(personas.nora, { type: "PROJECT", id: first.id, requiredSkillId: skill.id, requiredEmployeeCount: 2, note: "Shared requirement note" });
    await operationalService.addEmployeeRelation(personas.nora, { type: "LOCATION", id: location.id, employeeUserId: personas.cora.id });
    await operationalService.addNote(personas.nora, { type: "LOCATION", id: location.id, content: "Sensitive shared operational note" });
    expect(await db.select().from(operationalContacts).where(eq(operationalContacts.clientId, client.id))).toHaveLength(1);
    expect(await db.select().from(staffingRequirements).where(eq(staffingRequirements.projectId, first.id))).toHaveLength(1);
    expect(await db.select().from(operationalEmployeeRelations).where(eq(operationalEmployeeRelations.locationId, location.id))).toHaveLength(1);
    const events = await db.select().from(auditEvents).where(eq(auditEvents.actorUserId, personas.nora.id)); const metadata = JSON.stringify(events.map((event) => event.metadata));
    expect(metadata).not.toContain("44 Fictional Port Road"); expect(metadata).not.toContain("Sensitive gate detail"); expect(metadata).not.toContain("Sensitive shared operational note"); expect(metadata).not.toContain("ops@example.test");
  });

  it("enforces client descendant inheritance while Project and Location scopes never climb or reach siblings", async () => {
    const client = await root(); const siblingClient = await root(); await grant(personas.ava.id, "CLIENT", client.id);
    const project = await operationalService.createProject(personas.ava, { clientId: client.id, name: `Ava project ${randomUUID()}` });
    const sibling = await operationalService.createProject(personas.nora, { clientId: client.id, name: `Sibling ${randomUUID()}` });
    const location = await operationalService.createLocation(personas.ava, { clientId: client.id, name: "Ava location", address: "1 Alpha Road" });
    await expect(operationalService.createProject(personas.ava, { clientId: siblingClient.id, name: "Forbidden" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await grant(personas.projectAdmin.id, "PROJECT", project.id); await grant(personas.locationAdmin.id, "LOCATION", location.id);
    await expect(operationalService.getProjectDetail(personas.projectAdmin, project.id)).resolves.toMatchObject({ project: { id: project.id } });
    await expect(operationalService.getClientDetail(personas.projectAdmin, client.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.getProjectDetail(personas.projectAdmin, sibling.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.updateLocation(personas.locationAdmin, location.id, { expectedVersion: location.version, name: "Location scoped", address: location.address, latitude: null, longitude: null })).resolves.toMatchObject({ name: "Location scoped" });
    await expect(operationalService.getClientDetail(personas.locationAdmin, client.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.getProjectDetail(personas.locationAdmin, project.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.createLocation(personas.locationAdmin, { clientId: client.id, name: "Bootstrap", address: "Denied" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    expect((await operationalService.listClients(personas.unscoped)).length).toBe(0); expect((await operationalService.listProjects(personas.unscoped)).length).toBe(0); expect((await operationalService.listLocations(personas.unscoped)).length).toBe(0);
  });

  it("proves Account Manager, Responsible Admin, TEAM, designation, manager, and employee association grant no hidden authority", async () => {
    const client = await operationalService.createClient(personas.nora, { companyName: `Implicit ${randomUUID()}`, accountManagerUserId: personas.implicitAdmin.id });
    const project = await operationalService.createProject(personas.nora, { clientId: client.id, name: "Implicit project", responsibleAdminUserId: personas.implicitAdmin.id });
    const location = await operationalService.createLocation(personas.nora, { clientId: client.id, name: "Implicit site", address: "2 No Access Way" });
    await operationalService.addEmployeeRelation(personas.nora, { type: "CLIENT", id: client.id, employeeUserId: personas.implicitAdmin.id });
    await expect(operationalService.getClientDetail(personas.implicitAdmin, client.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.getProjectDetail(personas.implicitAdmin, project.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.getLocationDetail(personas.implicitAdmin, location.id)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
  });

  it("rejects cross-client links, partial/out-of-range coordinates, duplicates, stale writes, and unsafe archive transitions", async () => {
    const firstClient = await root(); const secondClient = await root();
    const project = await operationalService.createProject(personas.nora, { clientId: firstClient.id, name: "Cross-client guard" });
    const firstLocation = await operationalService.createLocation(personas.nora, { clientId: firstClient.id, name: "Same", address: "1 Same Road" });
    const duplicateTextLocation = await operationalService.createLocation(personas.nora, { clientId: firstClient.id, name: "Same", address: "1 Same Road" }); expect(duplicateTextLocation.id).not.toBe(firstLocation.id);
    const otherLocation = await operationalService.createLocation(personas.nora, { clientId: secondClient.id, name: "Other", address: "2 Other Road" });
    await expect(operationalService.linkProjectLocation(personas.nora, { projectId: project.id, locationId: otherLocation.id })).rejects.toMatchObject({ code: "INVALID_RELATIONSHIP" });
    await expect(operationalService.createLocation(personas.nora, { clientId: firstClient.id, name: "Partial", address: "A", latitude: 10 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(operationalService.createLocation(personas.nora, { clientId: firstClient.id, name: "Range", address: "A", latitude: 91, longitude: 10 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const updated = await operationalService.updateProject(personas.nora, project.id, { expectedVersion: project.version, name: project.name, status: "ACTIVE" });
    await expect(operationalService.updateProject(personas.nora, project.id, { expectedVersion: project.version, name: "Stale" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    await expect(operationalService.setClientArchived(personas.nora, firstClient.id, { expectedVersion: firstClient.version, archived: true })).rejects.toMatchObject({ code: "ARCHIVE_BLOCKED" });
    await operationalService.updateProject(personas.nora, project.id, { expectedVersion: updated.version, status: "COMPLETED" });
    const archived = await operationalService.setClientArchived(personas.nora, firstClient.id, { expectedVersion: firstClient.version, archived: true }); expect(archived.status).toBe("ARCHIVED");
    await expect(operationalService.addContact(personas.nora, { type: "CLIENT", id: firstClient.id, name: "Blocked" })).rejects.toMatchObject({ code: "ARCHIVED_RECORD" });
  });

  it("validates and audits explicit grants, keeps TEAM behavior separate, and rejects malformed/archived targets", async () => {
    const client = await root(); const granted = await operationalService.grantScope(personas.nora, { adminUserId: personas.ben.id, target: { type: "CLIENT", id: client.id } });
    expect((await operationalService.listClients(personas.ben)).map((row) => row.id)).toContain(client.id);
    await expect(operationalService.grantScope(personas.ava, { adminUserId: personas.ben.id, target: { type: "CLIENT", id: client.id } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(operationalService.grantScope(personas.nora, { adminUserId: personas.ben.id, target: { type: "CLIENT", id: "bad" } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const revoked = await operationalService.revokeScope(personas.nora, { grantId: granted.id, expectedVersion: granted.version }); expect((await operationalService.listClients(personas.ben)).map((row) => row.id)).not.toContain(client.id);
    const reactivated = await operationalService.grantScope(personas.nora, { adminUserId: personas.ben.id, target: { type: "CLIENT", id: client.id } }); expect(reactivated.version).toBe(revoked.version + 1);
    const teamGrant = (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, personas.ben.id), eq(adminScopeGrants.scopeType, "TEAM"))))[0]; expect(teamGrant?.active).toBe(true);
  });

  it("keeps shared notes author-editable, Super-Admin-archivable, employee-invisible, and audit-safe", async () => {
    const client = await root(); await grant(personas.ava.id, "CLIENT", client.id); await grant(personas.ben.id, "CLIENT", client.id);
    const note = await operationalService.addNote(personas.ava, { type: "CLIENT", id: client.id, content: "Original private operational content" });
    await expect(operationalService.updateNote(personas.ben, { noteId: note.id, expectedVersion: note.version, content: "Forged edit" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const edited = await operationalService.updateNote(personas.ava, { noteId: note.id, expectedVersion: note.version, content: "Edited private operational content" });
    await expect(operationalService.archiveNote(personas.ava, { noteId: note.id, expectedVersion: edited.version, reason: "Not allowed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await operationalService.archiveNote(personas.nora, { noteId: note.id, expectedVersion: edited.version, reason: "Superseded operational guidance" });
    const stored = (await db.select().from(operationalNotes).where(eq(operationalNotes.id, note.id)))[0]; expect(stored?.archivedAt).toBeInstanceOf(Date); expect(stored?.archiveReason).toBe("Superseded operational guidance");
    await expect(operationalService.listClients(personas.cora)).rejects.toMatchObject({ code: "FORBIDDEN" }); await expect(operationalService.getClientDetail(personas.cora, client.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.targetId, note.id)); const metadata = JSON.stringify(audit.map((event) => event.metadata)); expect(metadata).not.toContain("Edited private"); expect(metadata).not.toContain("Superseded operational guidance");
  });

  it("rolls back every business mutation when audit persistence fails", async () => {
    const failing = new OperationalService(async () => { throw new Error("forced Phase 3 audit failure"); }); const companyName = `Rollback ${randomUUID()}`;
    await expect(failing.createClient(personas.nora, { companyName })).rejects.toThrow("forced Phase 3 audit failure"); expect(await db.select().from(clients).where(eq(clients.companyName, companyName))).toHaveLength(0);
    const client = await root(); const projectName = `Rollback project ${randomUUID()}`; await expect(failing.createProject(personas.nora, { clientId: client.id, name: projectName })).rejects.toThrow("forced Phase 3 audit failure"); expect(await db.select().from(projects).where(eq(projects.name, projectName))).toHaveLength(0);
  });
});
