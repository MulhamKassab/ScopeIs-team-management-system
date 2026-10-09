// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import ProfilePage from "@/app/(protected)/profile/page";
import SkillsPage from "@/app/(protected)/skills/page";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), profile: vi.fn(), evidence: vi.fn(), skills: vi.fn(), employeeSkills: vi.fn() }));
vi.mock("@/modules/auth/session-service", () => ({ getCurrentActor: mocks.actor }));
vi.mock("@/modules/employees/employee-services", () => ({ employeeProfileService: { getOwnProfile: mocks.profile }, employeeSkillService: { listForEmployee: mocks.employeeSkills } }));
vi.mock("@/modules/evidence/service", () => ({ evidenceService: { listMine: mocks.evidence } }));
vi.mock("@/modules/evidence/repositories", () => ({ evidenceRepository: { activeSkillOptions: mocks.skills } }));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/modules/account-administration/actions", () => ({ completeWorkforceProfileAction: async () => ({}) }));
vi.mock("@/modules/employees/team-options", () => ({ listTeamOptions: async () => [{ id: "team:fictional", name: "Fictional team" }] }));
vi.mock("@/modules/employees/self-profile-form", () => ({ SelfProfileForm: () => <button>Edit profile</button> }));
vi.mock("@/modules/evidence/forms", () => ({ CapabilityEvidencePanel: () => <section aria-label="My supporting evidence" /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("own profile without a workforce record", () => {
  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"])("renders an actionable setup state for %s instead of crashing", async (role) => {
    mocks.actor.mockResolvedValue({ id: "legacy-person", displayName: "Legacy Person", role });
    mocks.profile.mockRejectedValue(new EmployeeDomainError("NOT_FOUND"));
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "My professional profile" })).toBeVisible();
    expect(screen.getByText(/Your sign-in account is ready/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Change your password" })).toHaveAttribute("href", "/account/change-password");
    if (role === "SUPER_ADMIN") expect(screen.getByRole("button", { name: "Complete workforce profile for Legacy Person" })).toBeVisible();
    else {
      expect(screen.queryByRole("button", { name: /Complete workforce profile/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Ask your Super Admin/)).toBeVisible();
    }
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.skills).not.toHaveBeenCalled();
  });

  it("does not conceal unexpected database failures as missing setup", async () => {
    mocks.actor.mockResolvedValue({ id: "legacy-person", displayName: "Legacy Person", role: "SUPER_ADMIN" });
    mocks.profile.mockRejectedValue(new Error("Fictional database failure"));
    await expect(ProfilePage()).rejects.toThrow("Fictional database failure");
  });

  it("explains missing setup on the Employee skills page", async () => {
    mocks.actor.mockResolvedValue({ id: "legacy-person", displayName: "Legacy Person", role: "EMPLOYEE" });
    mocks.employeeSkills.mockRejectedValue(new EmployeeDomainError("NOT_FOUND"));
    render(await SkillsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "My recorded skills" })).toBeVisible();
    expect(screen.getByText(/Ask your Super Admin/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open My Profile" })).toHaveAttribute("href", "/profile");
  });

  it("keeps unexpected skills failures visible to error handling", async () => {
    mocks.actor.mockResolvedValue({ id: "legacy-person", displayName: "Legacy Person", role: "EMPLOYEE" });
    mocks.employeeSkills.mockRejectedValue(new Error("Fictional database failure"));
    await expect(SkillsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Fictional database failure");
  });
});

describe("recorded skills in My profile", () => {
  async function renderOwnProfile(records: { association: { id: string }; skill: { name: string } }[]) {
    const actor = { id: "fictional-employee", displayName: "Fictional Employee", role: "EMPLOYEE" };
    mocks.actor.mockResolvedValue(actor);
    mocks.profile.mockResolvedValue({ user: actor, employeeCode: "FIC-001", team: "team:fictional", workEmail: null, workPhone: null, professionalSummary: "Fictional experience", version: 1 });
    mocks.evidence.mockResolvedValue({ items: [] });
    mocks.skills.mockResolvedValue([]);
    mocks.employeeSkills.mockResolvedValue(records);
    render(await ProfilePage());
    expect(mocks.employeeSkills).toHaveBeenCalledWith(actor, actor.id);
    return screen.getByRole("region", { name: "My recorded skills" });
  }

  it("shows the employee’s recorded skills beside their professional evidence", async () => {
    const skills = await renderOwnProfile([{ association: { id: "fictional-skill-record" }, skill: { name: "Fictional network skill" } }]);
    expect(within(skills).getByText("Fictional network skill")).toBeVisible();
    expect(within(skills).getByText(/recorded by your Super Admin/)).toBeVisible();
    expect(screen.getByRole("region", { name: "My supporting evidence" })).toBeInTheDocument();
  });

  it("explains when the employee has no recorded skills", async () => {
    const skills = await renderOwnProfile([]);
    expect(within(skills).getByText("No skills have been recorded on your profile.")).toBeVisible();
  });
});
