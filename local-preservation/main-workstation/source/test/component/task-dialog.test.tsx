// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskDialog } from "@/shared/components/task-dialog";
import { ThemeToggle } from "@/shared/components/theme-provider";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); document.documentElement.dataset.theme = "light"; });

function animateExit(dialog: HTMLDialogElement, duration = "180ms") {
  dialog.getAnimations = vi.fn(() => []);
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudoElement) => {
    const style = getStyle(element, pseudoElement);
    if (element === dialog && dialog.dataset.motionState === "closing") {
      style.animationName = "scopeis-dialog-exit";
      style.animationDuration = duration;
      style.animationDelay = "0s";
      style.animationIterationCount = "1";
    }
    return style;
  });
}

function animationEvent(target: Element, name = "scopeis-dialog-exit", pseudoElement = "", type = "animationend") {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, { animationName: { value: name }, pseudoElement: { value: pseudoElement } });
  fireEvent(target, event);
}

describe("focused task UI", () => {
  it("keeps forms out of the page until requested and returns to the trigger on cancellation", () => {
    render(<TaskDialog triggerLabel="Add project" title="New project" description="Add a project for this client."><label>Project name<input /></label></TaskDialog>);
    expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Add project" });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "New project" });
    expect(dialog).toHaveAccessibleDescription("Add a project for this client.");
    expect(screen.getByLabelText("Project name")).toBeVisible();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("keeps task feedback visible until the user closes it", () => {
    render(<TaskDialog triggerLabel="Request leave" title="New leave request"><p role="status">Request saved. Waiting for review.</p></TaskDialog>);
    fireEvent.click(screen.getByRole("button", { name: "Request leave" }));
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for review");
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request leave" })).toHaveFocus();
  });

  it("uses the applied theme for the first toggle after a dark-mode reload", () => {
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("returns to the section heading when saving disables the original trigger", () => {
    const view = (disabled: boolean) => <section><h2>Project locations</h2><TaskDialog triggerLabel="Link location" triggerDisabled={disabled} title="Link a location"><p>Saved</p></TaskDialog></section>;
    const { rerender } = render(view(false));
    fireEvent.click(screen.getByRole("button", { name: "Link location" }));
    rerender(view(true));
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.getByRole("heading", { name: "Project locations" })).toHaveFocus();
  });

  it("keeps the modal, feedback and scroll lock until its own exit finishes", () => {
    render(<TaskDialog triggerLabel="Request leave" title="New leave request"><p role="status">Request saved. Waiting for review.</p></TaskDialog>);
    const trigger = screen.getByRole("button", { name: "Request leave" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    animateExit(dialog);
    const close = screen.getByRole("button", { name: "Close", exact: true });
    close.focus();
    const nativeClose = vi.spyOn(dialog, "close");
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute("data-motion-state", "closing");
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(close).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for review");
    // Repeated dismissal and other motion do not release the modal early.
    fireEvent.click(close);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    animationEvent(screen.getByRole("status"));
    animationEvent(dialog, "scopeis-dialog-enter");
    animationEvent(dialog, "scopeis-dialog-exit", "::backdrop");
    expect(nativeClose).not.toHaveBeenCalled();
    animationEvent(dialog);
    expect(nativeClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes immediately when motion is reduced despite available CSS animation", () => {
    render(<TaskDialog triggerLabel="Edit project" title="Edit project"><input aria-label="Project name" /></TaskDialog>);
    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    animateExit(screen.getByRole("dialog") as HTMLDialogElement);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("cancels the previous exit when the same task is activated again", () => {
    vi.useFakeTimers();
    render(<TaskDialog triggerLabel="Review evidence" title="Review evidence"><input aria-label="Verification note" data-dialog-autofocus /></TaskDialog>);
    const trigger = screen.getByRole("button", { name: "Review evidence" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    animateExit(dialog);
    const nativeClose = vi.spyOn(dialog, "close");
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(dialog).toHaveAttribute("data-motion-state", "closing");
    fireEvent.click(trigger);
    expect(dialog).toHaveAttribute("data-motion-state", "open");
    expect(screen.getByLabelText("Verification note")).toHaveFocus();
    act(() => vi.advanceTimersByTime(1000));
    animationEvent(dialog);
    animationEvent(dialog, "scopeis-dialog-exit", "", "animationcancel");
    expect(dialog.open).toBe(true);
    expect(nativeClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(dialog).toHaveAttribute("data-motion-state", "closing");
    animationEvent(dialog);
    expect(nativeClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes immediately when the browser supports animation APIs but no exit is styled", () => {
    render(<TaskDialog triggerLabel="Edit project" title="Edit project"><input aria-label="Project name" /></TaskDialog>);
    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    dialog.getAnimations = vi.fn(() => []);
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit project" })).toHaveFocus();
  });

  it("uses a finite fallback when an exit event is lost and clears it on unmount", () => {
    vi.useFakeTimers();
    const setTimeout = vi.spyOn(window, "setTimeout");
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    document.body.style.overflow = "auto";
    const { unmount } = render(<TaskDialog triggerLabel="Edit project" title="Edit project"><input aria-label="Project name" /></TaskDialog>);
    const trigger = screen.getByRole("button", { name: "Edit project" });
    fireEvent.click(trigger);
    animateExit(screen.getByRole("dialog") as HTMLDialogElement);
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    act(() => vi.advanceTimersByTime(179));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(81));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    const exitTimer = setTimeout.mock.results.at(-1)?.value;
    unmount();
    expect(clearTimeout).toHaveBeenCalledWith(exitTimer);
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("dismisses and restores scroll immediately for navigation, even during an exit", () => {
    vi.useFakeTimers();
    const setTimeout = vi.spyOn(window, "setTimeout");
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    render(<TaskDialog triggerLabel="Find a feature" title="Workspace features" dismissOnNavigate><a href="#schedule">My schedule</a></TaskDialog>);
    fireEvent.click(screen.getByRole("button", { name: "Find a feature" }));
    animateExit(screen.getByRole("dialog") as HTMLDialogElement);
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    const exitTimer = setTimeout.mock.results.at(-1)?.value;
    expect(screen.getByRole("dialog")).toHaveAttribute("data-motion-state", "closing");
    const link = screen.getByRole("link", { name: "My schedule" });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(link, click);
    expect(click.defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(clearTimeout).toHaveBeenCalledWith(exitTimer);
  });
});
