// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmployeeDirectory } from "@/modules/employees/employee-directory";

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
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders a clear safe empty state", () => {
    render(<EmployeeDirectory profiles={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No employee records are available");
  });
});
