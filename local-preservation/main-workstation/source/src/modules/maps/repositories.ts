import "server-only";
import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, clients, employeePlanningLocations, employeeProfiles, employeeSkills, leaveRequests, locations, projects, scheduleAssignments, schedulePeriods, skills, users } from "@/db/schema";

export const mapRepository = {
  grants(userId: string) { return db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.active, true))); },
  publishedAssignments(date: string) {
    return db.select({ assignment: scheduleAssignments, period: schedulePeriods, client: clients, employee: users, profile: employeeProfiles, planning: employeePlanningLocations, project: projects, location: locations })
      .from(scheduleAssignments).innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId)).innerJoin(clients, eq(clients.id, schedulePeriods.clientId)).innerJoin(users, eq(users.id, scheduleAssignments.employeeUserId)).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).innerJoin(projects, eq(projects.id, scheduleAssignments.projectId)).innerJoin(locations, eq(locations.id, scheduleAssignments.locationId)).leftJoin(employeePlanningLocations, eq(employeePlanningLocations.employeeUserId, users.id))
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), eq(scheduleAssignments.assignmentDate, date))).orderBy(asc(users.displayName), asc(scheduleAssignments.startTime));
  },
  approvedUnavailable(employeeIds: string[], date: string) { return employeeIds.length ? db.selectDistinct({ employeeUserId: leaveRequests.employeeUserId }).from(leaveRequests).where(and(inArray(leaveRequests.employeeUserId, employeeIds), eq(leaveRequests.status, "APPROVED"), lte(leaveRequests.startDate, date), gte(leaveRequests.endDate, date))) : Promise.resolve([]); },
  employeeSkillRows(employeeIds: string[]) { return employeeIds.length ? db.select({ employeeUserId: employeeSkills.employeeUserId, skillId: skills.id, skillName: skills.name }).from(employeeSkills).innerJoin(skills, eq(skills.id, employeeSkills.skillId)).where(and(inArray(employeeSkills.employeeUserId, employeeIds), isNull(employeeSkills.archivedAt), eq(skills.active, true))) : Promise.resolve([]); },
};
