/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanningMapClient } from "@/modules/maps/planning-map-client";
import type { PlanningProjection } from "@/modules/maps/service";
const projection: PlanningProjection = { selectedDate: "2026-09-02", invalidFilter: false, role: "ADMIN", lastPublishedAt: null, noCoordinateCount: 0, filterOptions: { employees: [], skills: [], clients: [], projects: [], locations: [] }, assignments: [{ id: "a", schedulePeriodId: "period-a", startTime: "09:00", endTime: "11:00", employeeId: "e", employeeName: "Fictional Employee", employeeCoordinate: { latitude: 25.2125, longitude: 55.2625 }, employeePrecision: "coarse", worksite: { id: "l", name: "Fictional Site", coordinate: { latitude: 25.2, longitude: 55.27 } }, client: { id: "c", name: "Fictional Client" }, project: { id: "p", name: "Fictional Project" }, unavailable: true, skills: [], coverageGap: true, label: "Fictional" }] };
afterEach(() => vi.unstubAllGlobals());

describe("Phase 8 planning map fallback", () => {
  it("keeps the authorized list, coarse details and next actions when tiles fail, and can retry", () => {
    render(<PlanningMapClient projection={projection} />);
    fireEvent.error(document.querySelector("img")!);
    expect(screen.getByRole("alert")).toHaveTextContent("tiles could not be loaded");
    expect(within(screen.getByRole("region", { name: "Authorized planning list" })).getByRole("button", { name: /Fictional Employee/ })).toBeVisible();
    expect(screen.getAllByText(/Coarse planning area/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Review coverage" })).toHaveAttribute("href", "/coverage?assignment=a");
    expect(screen.getByRole("link", { name: "Open timetable" })).toHaveAttribute("href", "/schedule?month=2026-09&period=period-a");
    expect(screen.queryByRole("img", { name: "Static planned associations" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry map" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".planning-map-tiles img").length).toBeGreaterThan(0);
  });
});

describe("Phase 8 map interactions", () => {
  it.each(["ltr", "rtl"])("fits pins and keeps lines aligned after resizing and zooming in %s", (direction) => {
    let resize: ResizeObserverCallback = () => {};
    vi.stubGlobal("ResizeObserver", class { constructor(callback: ResizeObserverCallback) { resize = callback; } observe() {} disconnect() {} });
    render(<div dir={direction}><PlanningMapClient projection={projection} /></div>);
    const employee = screen.getByRole("button", { name: "Employee: Fictional Employee" });
    const worksite = screen.getByRole("button", { name: "Worksite: Fictional Site" });
    const line = document.querySelector(".planning-map-lines line")!;
    for (const size of [{ width: 1180, height: 440 }, { width: 360, height: 330 }]) {
      act(() => resize([{ contentRect: size } as ResizeObserverEntry], {} as ResizeObserver));
      for (const marker of [employee, worksite]) {
        expect(parseFloat(marker.style.left)).toBeGreaterThanOrEqual(64);
        expect(parseFloat(marker.style.left)).toBeLessThanOrEqual(size.width - 64);
        expect(parseFloat(marker.style.top)).toBeGreaterThanOrEqual(64);
        expect(parseFloat(marker.style.top)).toBeLessThanOrEqual(size.height - 64);
      }
      expect(Number(line.getAttribute("x1"))).toBe(parseFloat(employee.style.left));
      expect(Number(line.getAttribute("y1"))).toBe(parseFloat(employee.style.top));
      expect(Number(line.getAttribute("x2"))).toBe(parseFloat(worksite.style.left));
      expect(Number(line.getAttribute("y2"))).toBe(parseFloat(worksite.style.top));
    }
    const dx = parseFloat(worksite.style.left) - 180;
    const dy = parseFloat(worksite.style.top) - 165;
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(parseFloat(worksite.style.left) - 180).toBeCloseTo(dx * 2, 6);
    expect(parseFloat(worksite.style.top) - 165).toBeCloseTo(dy * 2, 6);
  });

  it("pans by pointer and keyboard without dragging when a marker is clicked", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    render(<PlanningMapClient projection={projection} />);
    const employee = screen.getByRole("button", { name: "Employee: Fictional Employee" });
    const canvas = screen.getByLabelText("Static planning map");
    const overlay = document.querySelector(".planning-map-markers")!;
    const before = { x: parseFloat(employee.style.left), y: parseFloat(employee.style.top) };
    fireEvent.pointerDown(overlay, { clientX: 200, clientY: 200, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 230, clientY: 220 });
    fireEvent.pointerUp(canvas);
    expect(parseFloat(employee.style.left)).toBeCloseTo(before.x + 30, 6);
    expect(parseFloat(employee.style.top)).toBeCloseTo(before.y + 20, 6);
    fireEvent.pointerDown(employee, { clientX: 230, clientY: 220, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 260, clientY: 240 });
    fireEvent.pointerUp(canvas);
    expect(parseFloat(employee.style.left)).toBeCloseTo(before.x + 30, 6);
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(parseFloat(employee.style.left)).toBeCloseTo(before.x - 30, 6);
  });

  it("groups coincident assignments, cycles them and synchronizes search, selection and layers", () => {
    const second = { ...projection.assignments[0], id: "b", employeeId: "other", employeeName: "Second Employee", startTime: "12:00", endTime: "14:00", unavailable: false, coverageGap: false };
    render(<PlanningMapClient projection={{ ...projection, assignments: [...projection.assignments, second] }} />);
    const group = screen.getByRole("button", { name: /Employee: Fictional Employee, Second Employee · 2 assignments/ });
    fireEvent.click(group);
    expect(screen.getByRole("heading", { name: "Second Employee" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View coverage" })).toHaveAttribute("href", "/coverage?assignment=b");
    fireEvent.click(group);
    expect(screen.getByRole("heading", { name: "Fictional Employee" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search published assignments" }), { target: { value: "second site" } });
    expect(screen.getByRole("heading", { name: "Second Employee" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Employees", exact: true }));
    expect(screen.queryByRole("button", { name: "Employee: Second Employee" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Static planned associations" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "On leave 1" }));
    expect(screen.getByRole("heading", { name: "No matching assignments" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search and view filters" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2");
  });

  it("keeps touch scrolling available until interaction is enabled, then pans and pinches", () => {
    vi.stubGlobal("PointerEvent", class extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 0; this.pointerType = init.pointerType ?? "mouse"; }
    });
    render(<PlanningMapClient projection={projection} />);
    const canvas = screen.getByLabelText("Static planning map");
    const employee = screen.getByRole("button", { name: "Employee: Fictional Employee" });
    const before = parseFloat(employee.style.left);
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "touch", clientX: 140, clientY: 100 });
    expect(parseFloat(employee.style.left)).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "Interact with map" }));
    expect(canvas).toHaveClass("map-touch-active");
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "touch", clientX: 130, clientY: 100 });
    expect(parseFloat(employee.style.left)).toBeCloseTo(before + 30, 6);
    const pinchedFrom = parseFloat(employee.style.left);
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 230, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: "touch", clientX: 330, clientY: 100 });
    expect(parseFloat(employee.style.left) - 360).toBeCloseTo((pinchedFrom - 360) * 2, 6);
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: "touch" });
    fireEvent.click(screen.getByRole("button", { name: "Lock map to scroll" }));
    expect(canvas).not.toHaveClass("map-touch-active");
  });
});
