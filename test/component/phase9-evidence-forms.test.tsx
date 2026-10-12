// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(async () => ({})) }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/modules/evidence/actions", () => {
  const action = async () => ({});
  return { archiveEvidenceAction: action, createEvidenceAction: mocks.create, reviewEvidenceAction: action, updateEvidenceAction: action };
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
beforeEach(() => { mocks.create.mockReset(); mocks.create.mockResolvedValue({}); });

describe("Phase 9 capability evidence forms", () => {
  it("renders every evidence section, textual state badges, and authorized delivery controls for the owner", () => {
    render(<CapabilityEvidencePanel items={[item]} skills={[{ id: "30000000-0000-4000-8000-000000000003", name: "Industrial Controls" }]} />);
    for (const heading of ["Certifications", "Portfolio", "Project examples", "CV", "Supporting documents"]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My documents & experience" })).toBeInTheDocument();
    expect(screen.getByText("Certifications").closest("details")).not.toHaveAttribute("open");
    expect(screen.getAllByRole("button", { name: "Add document or experience" })).toHaveLength(1);
    fireEvent.click(screen.getByText("Certifications"));
    // Colour must never be the only state signal.
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/Expires 2027-01-15 \(valid\)/)).toBeInTheDocument();
    expect(screen.getByText("Fictional Evidence.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview file" })).toHaveAttribute("href", `/api/evidence/files/${fileId}`);
    // The uploader is an accessible form whose labelled file input posts to the authorized route.
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Attach file" }));
    const uploader = screen.getByRole("form", { name: "Attach or replace file" });
    expect(uploader.querySelector('input[type="file"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Add document or experience" }));
    expect(screen.getByRole("form", { name: "Add document or experience" })).toBeInTheDocument();
    const kind = screen.getByLabelText("Document or experience type");
    expect(within(kind).getAllByRole("option")).toHaveLength(5);
    fireEvent.change(kind, { target: { value: "portfolio" } });
    expect(screen.getByLabelText("Portfolio link (HTTPS only)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Archive item" }));
    expect(screen.getByRole("form", { name: `Archive ${item.title}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Edit item" }));
    expect(screen.getByRole("form", { name: `Edit ${item.title}` })).toBeInTheDocument();
  });

  it("guides a saved item straight to its authorized file destination and starts a fresh create intent", async () => {
    mocks.create.mockResolvedValue({ success: "Document or experience saved.", savedItem: { id, title: item.title, version: 7, archived: false } });
    render(<CapabilityEvidencePanel items={[]} skills={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add document or experience" }));
    const form = screen.getByRole("form", { name: "Add document or experience" });
    const firstKey = form.querySelector<HTMLInputElement>('input[name="submissionKey"]')!.value;
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "Submitted title" } });
    fireEvent.submit(form);
    const uploader = await screen.findByRole("form", { name: "Attach file to saved item" });
    expect(screen.getByRole("heading", { name: item.title })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Add document or experience" })).not.toBeInTheDocument();
    expect(within(uploader).getByRole("button", { name: "Upload private file" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Add another item" }));
    const nextForm = screen.getByRole("form", { name: "Add document or experience" });
    expect(nextForm.querySelector<HTMLInputElement>('input[name="submissionKey"]')!.value).not.toBe(firstKey);
  });

  it("retains failed form details and its idempotency key for retry", async () => {
    mocks.create.mockResolvedValue({ error: "Please check the submitted evidence information." });
    render(<CapabilityEvidencePanel items={[]} skills={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add document or experience" }));
    const form = screen.getByRole("form", { name: "Add document or experience" });
    const submissionKey = form.querySelector<HTMLInputElement>('input[name="submissionKey"]')!.value;
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Keep my title" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Please check"));
    expect(screen.getByLabelText("Title")).toHaveValue("Keep my title");
    expect(form.querySelector<HTMLInputElement>('input[name="submissionKey"]')!.value).toBe(submissionKey);
    expect(screen.queryByRole("form", { name: "Attach file to saved item" })).not.toBeInTheDocument();
  });

  it("preserves archive counts and history without offering archived mutations", () => {
    render(<CapabilityEvidencePanel items={[{ ...item, archivedAt: "2026-10-12T00:00:00.000Z" }]} skills={[]} />);
    expect(screen.getByText("0 active items · 1 archived")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Certifications"));
    fireEvent.click(screen.getByText("1 archived item"));
    expect(screen.getByText(item.title)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Attach file" })).not.toBeInTheDocument();
  });

  it("shows the Super Admin review surface with per-item anchors and review controls", () => {
    render(<EvidenceReviewPanel items={[item]} skills={[]} employeeUserId="mock-employee-cora" employeeName="Cora Bell" />);
    expect(screen.getByRole("heading", { name: "Capability evidence" })).toBeInTheDocument();
    expect(screen.getByText(/Evidence recorded by Cora Bell/)).toBeInTheDocument();
    expect(document.getElementById(`evidence-${id}`)).not.toBeNull();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review evidence" }));
    expect(screen.getByRole("form", { name: `Mark ${item.title} reviewed` })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Verify ${item.title}` })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: `Reset review state for ${item.title}` })).toBeInTheDocument();
    expect(screen.getAllByText(/does not change staffing eligibility/i).length).toBeGreaterThan(0);
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
