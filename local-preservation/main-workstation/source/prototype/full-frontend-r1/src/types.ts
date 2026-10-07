export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
export type Team = "Team Alpha" | "Team Bravo" | "Shared Services";
export type ScheduleState = "Draft" | "Proposed" | "Published";
export type Status = "Active" | "Inactive";

export type Persona = {
  id: string;
  employeeId: string;
  name: string;
  role: Role;
  scope: string;
  team: Team;
};

export type Employee = {
  id: string;
  code: string;
  name: string;
  initials: string;
  role: Role;
  designation: string;
  team: Team;
  manager: string;
  status: Status;
  availability: "Available" | "Assigned" | "Leave" | "Limited";
  skills: string[];
  email: string;
  phone: string;
  location: string;
  arrangement: string;
  summary: string;
};

export type Client = {
  id: string;
  name: string;
  accountManager: string;
  projects: number;
  locations: number;
  staffing: string;
  nextWork: string;
  notes: number;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  admin: string;
  dates: string;
  status: string;
  staffing: string;
  skills: string[];
  locations: string[];
  health: "On plan" | "Attention" | "Coverage gap";
};

export type WorkLocation = {
  id: string;
  name: string;
  client: string;
  project: string;
  area: string;
  address: string;
  coordinates: string;
  siteHours: string;
  staffing: string;
  coverage: string;
  skills: string[];
};

export type Assignment = {
  id: string;
  employeeId: string | null;
  startDay: number;
  span: number;
  time: string;
  client: string;
  project: string;
  location: string;
  arrangement: string;
  state: ScheduleState;
  tone: "blue" | "green" | "purple" | "amber" | "grey" | "leave" | "danger";
  conflict?: string;
  skill?: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  dates: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  impact: string;
  submitted: string;
};

export type ReplacementRequest = {
  id: string;
  requester: string;
  assignmentId: string;
  gap: string;
  date: string;
  proposedEmployeeId: string;
  status: "Open" | "Awaiting decision" | "Approved" | "Changed" | "Rejected";
  scope: Team;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  recipient: string;
  time: string;
  href: string;
  read: boolean;
  archived: boolean;
};

export type AuditEvent = {
  id: string;
  actor: string;
  role: Role;
  action: string;
  target: string;
  time: string;
  correlation: string;
  detail: string;
};

export type DemoState = {
  personaId: string | null;
  scheduleState: ScheduleState;
  assignments: Assignment[];
  leave: LeaveRequest[];
  replacements: ReplacementRequest[];
  notifications: NotificationItem[];
  audit: AuditEvent[];
  sharedNotes: { id: string; parent: string; author: string; text: string; time: string }[];
  discussions: { id: string; requestId: string; author: string; text: string; time: string }[];
};
