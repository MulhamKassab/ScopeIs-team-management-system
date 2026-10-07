import type { Assignment, AuditEvent, Client, DemoState, Employee, Persona, Project, WorkLocation } from "./types";

export const personas: Persona[] = [
  { id: "nora", employeeId: "emp-nora", name: "Nora Albright", role: "SUPER_ADMIN", scope: "Global access", team: "Shared Services" },
  { id: "ava", employeeId: "emp-ava", name: "Ava Mercer", role: "ADMIN", scope: "Team Alpha scope", team: "Team Alpha" },
  { id: "ben", employeeId: "emp-ben", name: "Ben Iqbal", role: "ADMIN", scope: "Team Bravo scope", team: "Team Bravo" },
  { id: "cora", employeeId: "emp-cora", name: "Cora Bell", role: "EMPLOYEE", scope: "Personal and shared work", team: "Team Alpha" },
  { id: "dan", employeeId: "emp-dan", name: "Dan Rowan", role: "EMPLOYEE", scope: "Personal and shared work", team: "Team Bravo" },
];

export const employees: Employee[] = [
  { id:"emp-nora", code:"SIS-001", name:"Nora Albright", initials:"NA", role:"SUPER_ADMIN", designation:"Account Manager", team:"Shared Services", manager:"—", status:"Active", availability:"Assigned", skills:["Client coordination","Documentation"], email:"nora.albright@example.test", phone:"+971 50 000 0101", location:"Business Bay", arrangement:"In-house", summary:"Global workforce planning and operational governance." },
  { id:"emp-ava", code:"SIS-002", name:"Ava Mercer", initials:"AM", role:"ADMIN", designation:"Senior Network Engineer", team:"Team Alpha", manager:"Nora Albright", status:"Active", availability:"Assigned", skills:["Network design","Routing and switching","Wi-Fi"], email:"ava.mercer@example.test", phone:"+971 50 000 0102", location:"Dubai", arrangement:"Outsourced to Client", summary:"Team Alpha delivery lead and scoped planner." },
  { id:"emp-ben", code:"SIS-003", name:"Ben Iqbal", initials:"BI", role:"ADMIN", designation:"Project Coordinator", team:"Team Bravo", manager:"Nora Albright", status:"Active", availability:"Available", skills:["Client coordination","Documentation","Site survey"], email:"ben.iqbal@example.test", phone:"+971 50 000 0103", location:"Sharjah", arrangement:"In-house", summary:"Team Bravo planning and project coordination." },
  { id:"emp-cora", code:"SIS-004", name:"Cora Bell", initials:"CB", role:"EMPLOYEE", designation:"CCTV / Security Systems Engineer", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Assigned", skills:["CCTV","Access control","Site survey"], email:"cora.bell@example.test", phone:"+971 50 000 0104", location:"Al Quoz", arrangement:"Temporary Placement", summary:"Security systems engineer focused on CCTV and access control delivery." },
  { id:"emp-dan", code:"SIS-005", name:"Dan Rowan", initials:"DR", role:"EMPLOYEE", designation:"Cloud / DevOps Engineer", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Assigned", skills:["Cloud / DevOps","Database support","Documentation"], email:"dan.rowan@example.test", phone:"+971 50 000 0105", location:"Business Bay", arrangement:"In-house", summary:"Cloud platform delivery and operational support." },
  { id:"emp-layla", code:"SIS-006", name:"Layla Haddad", initials:"LH", role:"EMPLOYEE", designation:"Software Developer", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Leave", skills:["Software development","Database support"], email:"layla.haddad@example.test", phone:"+971 50 000 0106", location:"Dubai Marina", arrangement:"In-house", summary:"Full-stack application developer." },
  { id:"emp-maya", code:"SIS-007", name:"Maya Chen", initials:"MC", role:"EMPLOYEE", designation:"Software Developer", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Assigned", skills:["Software development","Cloud / DevOps"], email:"maya.chen@example.test", phone:"+971 50 000 0107", location:"JLT", arrangement:"Scheduled Visit", summary:"Frontend and mobile application developer." },
  { id:"emp-omar", code:"SIS-008", name:"Omar Nasser", initials:"ON", role:"EMPLOYEE", designation:"Network Engineer", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Assigned", skills:["Routing and switching","Wi-Fi","Fiber"], email:"omar.nasser@example.test", phone:"+971 50 000 0108", location:"Jebel Ali", arrangement:"Outsourced to Client", summary:"Network implementation and troubleshooting." },
  { id:"emp-tariq", code:"SIS-009", name:"Tariq Rahman", initials:"TR", role:"EMPLOYEE", designation:"Field Technician", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Limited", skills:["Site survey","Structured cabling","Documentation"], email:"tariq.rahman@example.test", phone:"+971 50 000 0109", location:"Sharjah", arrangement:"On-call", summary:"Field support, surveys, and site documentation." },
  { id:"emp-fatima", code:"SIS-010", name:"Fatima Al Zaabi", initials:"FA", role:"EMPLOYEE", designation:"Structured Cabling Technician", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Assigned", skills:["Structured cabling","Fiber","CCTV"], email:"fatima.alzaabi@example.test", phone:"+971 50 000 0110", location:"Dubai", arrangement:"Scheduled Visit", summary:"Structured cabling and fiber specialist." },
  { id:"emp-hassan", code:"SIS-011", name:"Hassan Rizvi", initials:"HR", role:"EMPLOYEE", designation:"Precision Cooling / HVAC Engineer", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Available", skills:["Precision cooling / HVAC","Site survey"], email:"hassan.rizvi@example.test", phone:"+971 50 000 0111", location:"Abu Dhabi", arrangement:"In-house", summary:"Precision cooling systems and environmental checks." },
  { id:"emp-leila", code:"SIS-012", name:"Leila Farouq", initials:"LF", role:"EMPLOYEE", designation:"Help Desk Engineer", team:"Shared Services", manager:"Nora Albright", status:"Active", availability:"Assigned", skills:["Help desk","Documentation","Client coordination"], email:"leila.farouq@example.test", phone:"+971 50 000 0112", location:"Business Bay", arrangement:"In-house", summary:"Internal and client-facing service desk coordination." },
  { id:"emp-arjun", code:"SIS-013", name:"Arjun Mehta", initials:"AR", role:"EMPLOYEE", designation:"Access Control Technician", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Assigned", skills:["Access control","CCTV","Structured cabling"], email:"arjun.mehta@example.test", phone:"+971 50 000 0113", location:"Al Quoz", arrangement:"Temporary Placement", summary:"Access control installation and testing." },
  { id:"emp-samira", code:"SIS-014", name:"Samira Khan", initials:"SK", role:"EMPLOYEE", designation:"Senior Network Engineer", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Assigned", skills:["Network design","Routing and switching","Wi-Fi"], email:"samira.khan@example.test", phone:"+971 50 000 0114", location:"Abu Dhabi", arrangement:"Outsourced to Client", summary:"Senior network architecture and client delivery." },
  { id:"emp-yousef", code:"SIS-015", name:"Yousef Karim", initials:"YK", role:"EMPLOYEE", designation:"CCTV / Security Systems Engineer", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Available", skills:["CCTV","Access control","Fiber"], email:"yousef.karim@example.test", phone:"+971 50 000 0115", location:"Sharjah", arrangement:"On-call", summary:"Security system maintenance and field response." },
  { id:"emp-rina", code:"SIS-016", name:"Rina Santos", initials:"RS", role:"EMPLOYEE", designation:"Network Engineer", team:"Team Alpha", manager:"Ava Mercer", status:"Active", availability:"Assigned", skills:["Wi-Fi","Routing and switching","Site survey"], email:"rina.santos@example.test", phone:"+971 50 000 0116", location:"Dubai", arrangement:"Scheduled Visit", summary:"Wireless surveys and network deployments." },
  { id:"emp-khalid", code:"SIS-017", name:"Khalid Mansoor", initials:"KM", role:"EMPLOYEE", designation:"Field Technician", team:"Team Bravo", manager:"Ben Iqbal", status:"Active", availability:"Available", skills:["Help desk","Structured cabling","Site survey"], email:"khalid.mansoor@example.test", phone:"+971 50 000 0117", location:"Jebel Ali", arrangement:"On-call", summary:"On-site troubleshooting and physical infrastructure support." },
  { id:"emp-sophia", code:"SIS-018", name:"Sophia Ivanova", initials:"SI", role:"EMPLOYEE", designation:"Project Coordinator", team:"Shared Services", manager:"Nora Albright", status:"Inactive", availability:"Limited", skills:["Documentation","Client coordination"], email:"sophia.ivanova@example.test", phone:"+971 50 000 0118", location:"Business Bay", arrangement:"In-house", summary:"Project administration and cross-team coordination." },
];

export const clients: Client[] = [
  { id:"northstar", name:"Northstar Medical Group", accountManager:"Nora Albright", projects:2, locations:3, staffing:"Covered", nextWork:"7 Sep · Business Bay", notes:4 },
  { id:"horizon", name:"Horizon Retail Holdings", accountManager:"Ava Mercer", projects:2, locations:4, staffing:"1 warning", nextWork:"9 Sep · DIP warehouse", notes:3 },
  { id:"marina", name:"Marina Heights Residences", accountManager:"Ben Iqbal", projects:1, locations:2, staffing:"Attention", nextWork:"14 Sep · Al Quoz", notes:5 },
  { id:"vertex", name:"Vertex Logistics", accountManager:"Nora Albright", projects:2, locations:3, staffing:"Covered", nextWork:"8 Sep · Jebel Ali", notes:2 },
  { id:"crestline", name:"Crestline Schools", accountManager:"Ava Mercer", projects:1, locations:5, staffing:"Covered", nextWork:"10 Sep · Sharjah", notes:6 },
  { id:"cedar", name:"Cedar Finance House", accountManager:"Nora Albright", projects:1, locations:2, staffing:"1 gap", nextWork:"16 Sep · Abu Dhabi", notes:1 },
];

export const projects: Project[] = [
  { id:"patient-portal", name:"Patient Portal Upgrade", client:"Northstar Medical Group", admin:"Ava Mercer", dates:"1 Sep–30 Oct 2026", status:"Active", staffing:"4 of 4", skills:["Software development","Cloud / DevOps"], locations:["Business Bay office"], health:"On plan" },
  { id:"warehouse-network", name:"Warehouse Network Refresh", client:"Vertex Logistics", admin:"Ben Iqbal", dates:"7–30 Sep 2026", status:"Active", staffing:"5 of 5", skills:["Network design","Fiber"], locations:["Jebel Ali operations site"], health:"On plan" },
  { id:"access-upgrade", name:"Access Control Upgrade", client:"Marina Heights Residences", admin:"Ava Mercer", dates:"14 Sep–15 Oct 2026", status:"Active", staffing:"2 of 3", skills:["Access control","CCTV"], locations:["Al Quoz workshop"], health:"Coverage gap" },
  { id:"branch-cloud", name:"Branch Cloud Migration", client:"Cedar Finance House", admin:"Ben Iqbal", dates:"15 Sep–30 Oct 2026", status:"Planning", staffing:"2 of 3", skills:["Cloud / DevOps","Database support"], locations:["Abu Dhabi branch"], health:"Attention" },
  { id:"school-cctv", name:"Campus CCTV Rollout", client:"Crestline Schools", admin:"Ava Mercer", dates:"1 Sep–20 Oct 2026", status:"Active", staffing:"4 of 4", skills:["CCTV","Structured cabling"], locations:["Sharjah service centre"], health:"On plan" },
];

export const locations: WorkLocation[] = [
  { id:"business-bay", name:"Business Bay office", client:"Northstar Medical Group", project:"Patient Portal Upgrade", area:"Business Bay", address:"Office tower, Business Bay, Dubai", coordinates:"25.1866, 55.2648", siteHours:"08:00–18:00", staffing:"3 planned", coverage:"Satisfied", skills:["Software development","Cloud / DevOps"] },
  { id:"dip", name:"Dubai Investment Park warehouse", client:"Horizon Retail Holdings", project:"Retail Network Renewal", area:"Dubai Investment Park", address:"Warehouse district, DIP, Dubai", coordinates:"24.9857, 55.1627", siteHours:"07:00–17:00", staffing:"2 planned", coverage:"1 warning", skills:["Routing and switching","Fiber"] },
  { id:"jebel-ali", name:"Jebel Ali operations site", client:"Vertex Logistics", project:"Warehouse Network Refresh", area:"Jebel Ali", address:"Operations zone, Jebel Ali, Dubai", coordinates:"24.9850, 55.0273", siteHours:"07:00–19:00", staffing:"5 planned", coverage:"Satisfied", skills:["Network design","Structured cabling"] },
  { id:"sharjah", name:"Sharjah service centre", client:"Crestline Schools", project:"Campus CCTV Rollout", area:"Industrial Area, Sharjah", address:"Service centre, Sharjah", coordinates:"25.3208, 55.4095", siteHours:"08:00–17:00", staffing:"4 planned", coverage:"Satisfied", skills:["CCTV","Access control"] },
  { id:"abu-dhabi", name:"Abu Dhabi branch", client:"Cedar Finance House", project:"Branch Cloud Migration", area:"Al Maryah Island", address:"Branch office, Abu Dhabi", coordinates:"24.5011, 54.3870", siteHours:"08:00–18:00", staffing:"2 planned", coverage:"1 gap", skills:["Cloud / DevOps","Database support"] },
  { id:"al-quoz", name:"Al Quoz workshop", client:"Marina Heights Residences", project:"Access Control Upgrade", area:"Al Quoz", address:"Workshop district, Al Quoz, Dubai", coordinates:"25.1412, 55.2241", siteHours:"07:30–17:30", staffing:"2 planned", coverage:"Attention", skills:["Access control","CCTV"] },
];

export const initialAssignments: Assignment[] = [
  { id:"a1", employeeId:"emp-ava", startDay:1, span:3, time:"09:00–17:00", client:"Northstar Medical Group", project:"Patient Portal Upgrade", location:"Business Bay office", arrangement:"Outsourced to Client", state:"Published", tone:"green", skill:"Client coordination" },
  { id:"a2", employeeId:"emp-cora", startDay:2, span:3, time:"09:00–17:00", client:"Marina Heights Residences", project:"Access Control Upgrade", location:"Al Quoz workshop", arrangement:"Temporary Placement", state:"Proposed", tone:"purple", skill:"Access control", conflict:"Overlap on 23 Sep · 13:00–15:00" },
  { id:"a3", employeeId:"emp-cora", startDay:3, span:1, time:"13:00–15:00", client:"Vertex Logistics", project:"Site Survey", location:"Jebel Ali operations site", arrangement:"Scheduled Visit", state:"Proposed", tone:"danger", skill:"Site survey", conflict:"Two locations overlap" },
  { id:"a4", employeeId:"emp-dan", startDay:1, span:5, time:"09:00–17:00", client:"Cedar Finance House", project:"Branch Cloud Migration", location:"Business Bay office", arrangement:"In-house", state:"Draft", tone:"blue", skill:"Cloud / DevOps" },
  { id:"a5", employeeId:"emp-layla", startDay:2, span:4, time:"Full day", client:"—", project:"Approved leave", location:"—", arrangement:"Leave", state:"Published", tone:"leave", skill:"Software development" },
  { id:"a6", employeeId:"emp-maya", startDay:3, span:2, time:"09:00–18:00", client:"Northstar Medical Group", project:"Patient Portal Upgrade", location:"Business Bay office", arrangement:"In-house", state:"Proposed", tone:"green", skill:"Software development", conflict:"Scarce skill coverage: required 1 · available 0" },
  { id:"a7", employeeId:"emp-omar", startDay:1, span:5, time:"08:00–16:00", client:"Vertex Logistics", project:"Warehouse Network Refresh", location:"Jebel Ali operations site", arrangement:"Outsourced to Client", state:"Published", tone:"green", skill:"Routing and switching" },
  { id:"a8", employeeId:"emp-tariq", startDay:1, span:1, time:"09:00–13:00", client:"Horizon Retail Holdings", project:"Backup DR Drill", location:"Dubai Investment Park warehouse", arrangement:"Scheduled Visit", state:"Draft", tone:"amber", skill:"Documentation" },
  { id:"a9", employeeId:null, startDay:4, span:2, time:"09:00–17:00", client:"Cedar Finance House", project:"Database cutover support", location:"Abu Dhabi branch", arrangement:"Unassigned", state:"Draft", tone:"amber", skill:"Database support", conflict:"No qualified employee is assigned" },
  { id:"a10", employeeId:"emp-fatima", startDay:1, span:3, time:"07:30–16:30", client:"Crestline Schools", project:"Campus CCTV Rollout", location:"Sharjah service centre", arrangement:"Scheduled Visit", state:"Published", tone:"blue", skill:"Structured cabling" },
  { id:"a11", employeeId:"emp-hassan", startDay:4, span:2, time:"10:00–16:00", client:"Northstar Medical Group", project:"Cooling inspection", location:"Business Bay office", arrangement:"Scheduled Visit", state:"Draft", tone:"amber", skill:"Precision cooling / HVAC" },
  { id:"a12", employeeId:"emp-leila", startDay:1, span:7, time:"08:00–18:00", client:"Internal", project:"On-call support", location:"Remote", arrangement:"On-call", state:"Published", tone:"grey", skill:"Help desk" },
  { id:"a13", employeeId:"emp-arjun", startDay:2, span:4, time:"09:00–17:00", client:"Marina Heights Residences", project:"Access Control Upgrade", location:"Al Quoz workshop", arrangement:"Temporary Placement", state:"Proposed", tone:"purple", skill:"Access control" },
  { id:"a14", employeeId:"emp-samira", startDay:1, span:5, time:"09:00–17:00", client:"Horizon Retail Holdings", project:"Retail Network Renewal", location:"Dubai Investment Park warehouse", arrangement:"Outsourced to Client", state:"Published", tone:"green", skill:"Network design" },
  { id:"a15", employeeId:"emp-yousef", startDay:6, span:2, time:"On-call", client:"Internal", project:"Security support", location:"Remote", arrangement:"On-call", state:"Published", tone:"grey", skill:"CCTV" },
  { id:"a16", employeeId:"emp-rina", startDay:3, span:3, time:"09:00–17:00", client:"Crestline Schools", project:"Wi-Fi survey", location:"Sharjah service centre", arrangement:"Scheduled Visit", state:"Draft", tone:"blue", skill:"Wi-Fi" },
  { id:"a17", employeeId:"emp-khalid", startDay:1, span:2, time:"08:00–16:00", client:"Vertex Logistics", project:"Rack preparation", location:"Jebel Ali operations site", arrangement:"Scheduled Visit", state:"Draft", tone:"blue", skill:"Structured cabling" },
];

const initialAudit: AuditEvent[] = [
  { id:"au1", actor:"Nora Albright", role:"SUPER_ADMIN", action:"Published schedule", target:"September 2026 · Week 1", time:"1 Sep 2026, 4:35 PM", correlation:"SCH-SEP-PUB-01", detail:"18 employees notified." },
  { id:"au2", actor:"Nora Albright", role:"SUPER_ADMIN", action:"Changed system role", target:"Ava Mercer", time:"31 Aug 2026, 11:20 AM", correlation:"ROLE-024", detail:"Employee → Admin; Team Alpha scope granted separately." },
  { id:"au3", actor:"Nora Albright", role:"SUPER_ADMIN", action:"Approved leave", target:"Layla Haddad", time:"30 Aug 2026, 3:12 PM", correlation:"LEV-203", detail:"Approved 22–25 Sep 2026." },
  { id:"au4", actor:"Nora Albright", role:"SUPER_ADMIN", action:"Approved replacement", target:"REQ-041", time:"29 Aug 2026, 10:05 AM", correlation:"REP-041", detail:"Candidate changed to Omar Nasser." },
  { id:"au5", actor:"Nora Albright", role:"SUPER_ADMIN", action:"Warning override", target:"A-119", time:"28 Aug 2026, 5:40 PM", correlation:"OVR-009", detail:"After-hours site access confirmed by client; reason recorded." },
];

export const initialDemoState: DemoState = {
  personaId: null,
  scheduleState: "Proposed",
  assignments: initialAssignments,
  leave: [
    { id:"LEV-204", employeeId:"emp-maya", dates:"23–24 Sep 2026", status:"Pending", reason:"Private medical appointment and recovery time.", impact:"Approval would leave zero available Software Developers.", submitted:"1 Sep 2026, 9:18 AM" },
    { id:"LEV-203", employeeId:"emp-layla", dates:"22–25 Sep 2026", status:"Approved", reason:"Private family commitment.", impact:"One active software developer remains before LEV-204.", submitted:"28 Aug 2026, 2:10 PM" },
    { id:"LEV-198", employeeId:"emp-omar", dates:"7 Sep 2026", status:"Rejected", reason:"Private reason recorded.", impact:"Warehouse cutover required the only on-site network lead.", submitted:"24 Aug 2026, 4:01 PM" },
  ],
  replacements: [
    { id:"REP-042", requester:"Ava Mercer", assignmentId:"a6", gap:"Software development coverage", date:"23–24 Sep 2026", proposedEmployeeId:"emp-dan", status:"Awaiting decision", scope:"Team Alpha" },
    { id:"REP-041", requester:"Ben Iqbal", assignmentId:"a7", gap:"Network lead unavailable", date:"12 Sep 2026", proposedEmployeeId:"emp-omar", status:"Approved", scope:"Team Bravo" },
  ],
  notifications: [
    { id:"n1", type:"Schedule", title:"Schedule published", detail:"Your assignments for 7–13 Sep are available.", recipient:"All affected employees", time:"1 Sep, 4:35 PM", href:"/schedule", read:false, archived:false },
    { id:"n2", type:"Leave", title:"Leave request awaiting decision", detail:"Maya Chen requested 23–24 Sep.", recipient:"Nora Albright", time:"1 Sep, 9:18 AM", href:"/leave", read:false, archived:false },
    { id:"n3", type:"Replacement", title:"Replacement request submitted", detail:"Ava Mercer proposed Dan Rowan for REP-042.", recipient:"Nora Albright", time:"1 Sep, 10:02 AM", href:"/replacements/REP-042", read:false, archived:false },
    { id:"n4", type:"Evidence", title:"Portfolio updated", detail:"Cora Bell added a project example.", recipient:"Nora Albright", time:"31 Aug, 3:44 PM", href:"/employees/emp-cora", read:true, archived:false },
    { id:"n5", type:"Certification", title:"Certification expires soon", detail:"Samira Khan · Network Expert · 15 Oct 2026.", recipient:"Nora Albright", time:"30 Aug, 8:00 AM", href:"/skills", read:true, archived:false },
    { id:"n6", type:"Discussion", title:"New clarification message", detail:"Cora Bell replied to REQ-318.", recipient:"Ava Mercer", time:"29 Aug, 2:24 PM", href:"/requests/REQ-318", read:true, archived:true },
  ],
  audit: initialAudit,
  sharedNotes: [
    { id:"note-1", parent:"northstar", author:"Leila Farouq", text:"Reception access is confirmed from 08:30; call the site contact on arrival.", time:"31 Aug 2026, 2:10 PM" },
    { id:"note-2", parent:"access-upgrade", author:"Cora Bell", text:"Controller cabinet labels were photographed and added to the fictional demo record.", time:"30 Aug 2026, 4:50 PM" },
  ],
  discussions: [
    { id:"m1", requestId:"REQ-318", author:"Ava Mercer", text:"Please confirm whether the 08:00 site access window works for you.", time:"31 Aug, 1:10 PM" },
    { id:"m2", requestId:"REQ-318", author:"Cora Bell", text:"Confirmed. I will arrive by 07:50 and meet the site contact.", time:"31 Aug, 2:24 PM" },
  ],
};

export const skillCatalogue = [
  ["Network design",9,"3 projects","Active"],["Routing and switching",8,"4 locations","Active"],["Wi-Fi",6,"2 projects","Active"],["CCTV",7,"3 projects","Active"],["Access control",5,"2 locations","Active"],["Structured cabling",7,"4 locations","Active"],["Fiber",5,"2 projects","Active"],["Precision cooling / HVAC",1,"1 location","Active"],["Software development",2,"2 projects","Active"],["Cloud / DevOps",3,"2 projects","Active"],["Database support",2,"1 project","Active"],["Help desk",3,"Shared Services","Active"],["Site survey",8,"All field work","Active"],["Documentation",12,"All projects","Active"],["Client coordination",5,"6 clients","Active"],
] as const;
