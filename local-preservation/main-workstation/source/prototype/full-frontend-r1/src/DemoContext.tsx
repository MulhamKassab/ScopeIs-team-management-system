import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialDemoState } from "./fixtures";
import type { Assignment, AuditEvent, DemoState, LeaveRequest, NotificationItem, ReplacementRequest, ScheduleState } from "./types";

type DemoContextValue = {
  state: DemoState;
  theme: "light" | "dark";
  direction: "ltr" | "rtl";
  collapsed: boolean;
  toast: string | null;
  setPersona: (personaId: string | null) => void;
  setScheduleState: (value: ScheduleState) => void;
  updateAssignment: (assignment: Assignment) => void;
  removeAssignment: (id: string) => void;
  duplicateAssignment: (id: string) => string | null;
  addLeave: (request: LeaveRequest) => void;
  decideLeave: (id: string, status: "Approved" | "Rejected") => void;
  addReplacement: (request: ReplacementRequest) => void;
  decideReplacement: (id: string, status: "Approved" | "Changed" | "Rejected", employeeId?: string) => void;
  addNotification: (item: NotificationItem) => void;
  toggleNotificationRead: (id: string) => void;
  toggleNotificationArchived: (id: string) => void;
  markAllRead: () => void;
  addSharedNote: (parent: string, author: string, text: string) => void;
  addDiscussion: (requestId: string, author: string, text: string) => void;
  addAudit: (event: AuditEvent) => void;
  toggleTheme: () => void;
  toggleDirection: () => void;
  toggleCollapsed: () => void;
  notify: (message: string) => void;
  reset: () => void;
};

const STORAGE_KEY = "scopeis-full-frontend-r1-release";
const DemoContext = createContext<DemoContextValue | null>(null);

function loadState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...initialDemoState, ...JSON.parse(saved) } as DemoState;
  } catch {
    // The deterministic fixture set remains available when persistence is unavailable.
  }
  return structuredClone(initialDemoState);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("scopeis-prototype-theme") === "dark" ? "dark" : "light"));
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("scopeis-prototype-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  const value = useMemo<DemoContextValue>(() => ({
    state,
    theme,
    direction,
    collapsed,
    toast,
    setPersona: (personaId) => setState((current) => ({ ...current, personaId })),
    setScheduleState: (scheduleState) => setState((current) => ({ ...current, scheduleState })),
    updateAssignment: (assignment) => {
      setState((current) => ({ ...current, assignments: current.assignments.some((item) => item.id === assignment.id) ? current.assignments.map((item) => item.id === assignment.id ? assignment : item) : [...current.assignments, assignment] }));
      notify("Assignment saved in demo state.");
    },
    removeAssignment: (id) => {
      setState((current) => ({ ...current, assignments: current.assignments.filter((item) => item.id !== id) }));
      notify("Assignment removed from demo state.");
    },
    duplicateAssignment: (id) => {
      const source = state.assignments.find((item) => item.id === id);
      if (!source) return null;
      const copy = { ...source, id: createId("assignment"), startDay: Math.min(7, source.startDay + 1), state: "Draft" as const };
      setState((current) => ({ ...current, assignments: [...current.assignments, copy] }));
      notify("Draft copy created one day later.");
      return copy.id;
    },
    addLeave: (request) => {
      setState((current) => ({ ...current, leave: [request, ...current.leave] }));
      notify("Leave request submitted.");
    },
    decideLeave: (id, status) => {
      setState((current) => ({ ...current, leave: current.leave.map((item) => item.id === id ? { ...item, status } : item) }));
      notify(`Leave request ${status.toLowerCase()}.`);
    },
    addReplacement: (request) => {
      setState((current) => ({ ...current, replacements: [request, ...current.replacements] }));
      notify("Replacement request submitted for decision.");
    },
    decideReplacement: (id, status, employeeId) => {
      setState((current) => ({ ...current, replacements: current.replacements.map((item) => item.id === id ? { ...item, status, proposedEmployeeId: employeeId ?? item.proposedEmployeeId } : item) }));
      notify(`Replacement request ${status.toLowerCase()}.`);
    },
    addNotification: (item) => setState((current) => ({ ...current, notifications: [item, ...current.notifications] })),
    toggleNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: !item.read } : item) })),
    toggleNotificationArchived: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, archived: !item.archived } : item) })),
    markAllRead: () => {
      setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }));
      notify("All notifications marked read.");
    },
    addSharedNote: (parent, author, text) => {
      setState((current) => ({ ...current, sharedNotes: [...current.sharedNotes, { id: createId("note"), parent, author, text, time: "Just now" }] }));
      notify("Shared work note added.");
    },
    addDiscussion: (requestId, author, text) => {
      setState((current) => ({ ...current, discussions: [...current.discussions, { id: createId("message"), requestId, author, text, time: "Just now" }] }));
      notify("Message posted to participants.");
    },
    addAudit: (event) => setState((current) => ({ ...current, audit: [event, ...current.audit] })),
    toggleTheme: () => setTheme((value) => value === "light" ? "dark" : "light"),
    toggleDirection: () => setDirection((value) => value === "ltr" ? "rtl" : "ltr"),
    toggleCollapsed: () => setCollapsed((value) => !value),
    notify,
    reset: () => {
      setState(structuredClone(initialDemoState));
      localStorage.removeItem(STORAGE_KEY);
      notify("Demo data reset to the original fictional fixtures.");
    },
  // state is intentionally part of this local prototype context.
  }), [state, theme, direction, collapsed, toast]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
