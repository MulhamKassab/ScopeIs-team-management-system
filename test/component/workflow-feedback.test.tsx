// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { announceWorkflowSuccess, WorkflowFeedback } from "@/shared/components/workflow-feedback";

it("retains actual action success after the related form disappears and allows dismissal", () => {
  const { rerender } = render(<><WorkflowFeedback /><form aria-label="Decision form" /></>);
  act(() => announceWorkflowSuccess({}));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  act(() => announceWorkflowSuccess({ success: "Replacement request decision saved." }));
  rerender(<><WorkflowFeedback /></>);
  expect(screen.queryByRole("form", { name: "Decision form" })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Replacement request decision saved.");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss confirmation" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
