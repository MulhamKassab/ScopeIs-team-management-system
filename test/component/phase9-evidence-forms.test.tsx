// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/modules/evidence/actions", () => {
  const action = async () => ({});
  return { archiveEvidenceAction: action, createEvidenceAction: action, reviewEvidenceAction: action, updateEvidenceAction: action };
});

import { CapabilityEvidencePanel, CertificationSummaryPanel, EvidenceReviewPanel } from "@/modules/evidence/forms";
import type { CertificationSummaryView, EvidenceItemView } from "@/modules/evidence/service";

const id = "10000000-0000-4000-8000-000000000001";
const fileId = "20000000-0000-4000-8000-000000000002";
const item: EvidenceItemView = {
  id, kind: "certification", title: "Fictional Arc Flash Certification", issuer: "Fictional Safety Institute", issueDate: "2026-01-15", expiryDate: "2027-01-15",
  expiryStatus: "valid", details: null, externalUrl: null, relatedSkillId: null, relatedSkillName: null, reviewState: "verified", isNewOrUpdated: false,
  version: 3, archivedAt: null, isActiveCv: false,
  files: [{ id: fileId, originalFilename: "Fictional Evidence.pdf", contentType: "application/pdf", sizeBytes: 2048, version: 2, uploadedAt: "2026-06-01T00:00:00.000Z", canPreview: true, archivedAt: null }],
};
const summary: CertificationSummaryView = { id, title: "Fictional Scoped Summary", issuer: "Fictional Safety Institute", issueDate: "2026-01-15", expiryDate: "2027-01-15", expiryStatus: "valid", reviewState: "reviewed", relatedSkillName: null };

describe("Phase 9 capability evidence forms", () => {
  it("renders every evidence section, textual state badges, and authorized delivery controls for the owner", () => {
    render(<CapabilityEvidencePanel items={[item]} skills={[{ id: "30000000-0000-4000-8000-000000000003", name: "Industrial Controls" }]} />);
    for (const heading of ["Certifications", "Portfolio", "Project examples", "CV", "Supporting documents"]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My capability evidence" })).toBeInTheDocument();
    // Colour must never be the only state signal.
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/Expires 2027-01-15 \(valid\)/)).toBeInTheDocument();
    expect(screen.getByText("Fictional Evidence.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview file" })).toHaveAttribute("href", `/api/evidence/files/${fileId}`);
    // The uploader is an accessible form whose labelled file input posts to the authorized route.
    const uploader = screen.getByRole("form", { name: "Attach or replace file" });
    expect(uploader.querySelector('input[type="file"]')).not.toBeNull();
    expect(screen.getByRole("form", { name: "Add certifications" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Archive ${item.title}` })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Edit ${item.title}` })).toBeInTheDocument();
  });

  it("shows the Super Admin review surface with per-item anchors and review controls", () => {
    render(<EvidenceReviewPanel items={[item]} skills={[]} employeeUserId="mock-employee-cora" employeeName="Cora Bell" />);
    expect(screen.getByRole("heading", { name: "Capability evidence" })).toBeInTheDocument();
    expect(screen.getByText(/Evidence recorded by Cora Bell/)).toBeInTheDocument();
    expect(document.getElementById(`evidence-${id}`)).not.toBeNull();
    expect(screen.getByRole("form", { name: `Mark ${item.title} reviewed` })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Verify ${item.title}` })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Reset review state for ${item.title}` })).toBeInTheDocument();
    expect(screen.getByText(/never change coverage, replacement eligibility/i)).toBeInTheDocument();
  });

  it("keeps the scoped-Admin projection to certification summary facts only", () => {
    const { container } = render(<CertificationSummaryPanel rows={[summary]} employeeName="Cora Bell" />);
    expect(screen.getByRole("heading", { name: "Certification summary" })).toBeInTheDocument();
    expect(screen.getByText(/Certifications recorded by Cora Bell/)).toBeInTheDocument();
    expect(screen.getByText("Fictional Scoped Summary")).toBeInTheDocument();
    expect(screen.getByText(/withheld/i)).toBeInTheDocument();
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(screen.queryByLabelText("Attach or replace file")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
