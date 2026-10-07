// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmployeeDetail } from "@/modules/employees/employee-detail";

describe("EmployeeDetail", () => {
  it("omits contact and location values from the Admin projection", () => {
    render(<EmployeeDetail canManage={false} employee={{ userId: "employee-1", employeeCode: "EMP-1", team: "team:alpha", designationId: null, designationName: "Engineer", managerUserId: null, managerName: null, workingPattern: null, version: 1, user: { displayName: "Avery", role: "EMPLOYEE", active: true } }} />);
    expect(screen.getByText("Avery")).toBeInTheDocument();
    expect(screen.queryByText("Work email")).not.toBeInTheDocument();
  });
});
