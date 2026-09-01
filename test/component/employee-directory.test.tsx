// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmployeeDirectory } from "@/modules/employees/employee-directory";
import type { CreateEmployeeFormAction } from "@/modules/employees/employee-create-action";

const noOpCreateEmployee: CreateEmployeeFormAction = async () => ({});

describe("EmployeeDirectory", () => {
  it("renders only approved directory metadata", () => {
    render(<EmployeeDirectory profiles={[{
      userId: "employee-1", employeeCode: "EMP-001", team: "team:alpha",
      user: { id: "employee-1", displayName: "Avery Morgan", role: "EMPLOYEE", active: true },
    }]} />);
    expect(screen.getByRole("heading", { name: "Employee directory" })).toBeInTheDocument();
    expect(screen.getByText("Avery Morgan")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Active" })).toBeInTheDocument();
  });

  it("renders a clear safe empty state", () => {
    render(<EmployeeDirectory profiles={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No employee records are available");
  });

  it("shows the workforce-record creation action only when the protected page supplies it", () => {
    const { rerender } = render(<EmployeeDirectory profiles={[]} createEmployeeAction={noOpCreateEmployee} />);
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    rerender(<EmployeeDirectory profiles={[]} />);
    expect(screen.queryByRole("button", { name: "Add employee" })).not.toBeInTheDocument();
  });

  it("renders accessible active filters and a distinct no-results state", () => {
    render(<EmployeeDirectory profiles={[]} filters={{ query: "Avery", status: "active" }} filterOptions={{
      teams: ["team:alpha"], designations: [{ id: "844f52b6-2baf-4d9f-a8cf-3fbbd4f3e1ef", name: "Field Engineer" }],
    }} />);
    expect(screen.getByRole("searchbox", { name: "Search employees" })).toHaveValue("Avery");
    expect(screen.getByRole("combobox", { name: "Designation" })).toHaveTextContent("Field Engineer");
    expect(screen.getByText("2 active filters")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/employees");
    expect(screen.getByRole("heading", { name: "No matching employees" })).toBeInTheDocument();
  });

  it("fails invalid parameters closed without rendering records", () => {
    render(<EmployeeDirectory profiles={[]} invalidQuery />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be applied");
    expect(screen.getByRole("heading", { name: "No matching employees" })).toBeInTheDocument();
  });
});
