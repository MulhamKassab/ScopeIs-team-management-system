/** Fictional business facts only. Derived availability/coverage is always calculated by the app. */
export const workforce = [
  ['nora','Nora Albright','SUPER_ADMIN','shared','Account Manager',['Client coordination','Documentation']],
  ['ava','Ava Mercer','ADMIN','alpha','Senior Network Engineer',['Network design','Routing and switching','Wi-Fi']],
  ['ben','Ben Iqbal','ADMIN','bravo','Project Coordinator',['Client coordination','Documentation','Site survey']],
  ['cora','Cora Bell','EMPLOYEE','alpha','Security Systems Engineer',['CCTV','Access control','Site survey']],
  ['dan','Dan Rowan','EMPLOYEE','bravo','Cloud / DevOps Engineer',['Cloud / DevOps','Database support','Documentation']],
  ['layla','Layla Haddad','EMPLOYEE','alpha','Software Developer',['Software development','Database support']],
  ['maya','Maya Chen','EMPLOYEE','alpha','Software Developer',['Software development','Cloud / DevOps']],
  ['omar','Omar Nasser','EMPLOYEE','bravo','Network Engineer',['Routing and switching','Wi-Fi','Fiber']],
  ['tariq','Tariq Rahman','EMPLOYEE','bravo','Field Technician',['Site survey','Structured cabling','Documentation']],
  ['fatima','Fatima Al Zaabi','EMPLOYEE','alpha','Structured Cabling Technician',['Structured cabling','Fiber','CCTV']],
  ['hassan','Hassan Rizvi','EMPLOYEE','bravo','Precision Cooling / HVAC Engineer',['Precision cooling / HVAC','Site survey']],
  ['leila','Leila Farouq','EMPLOYEE','shared','Help Desk Engineer',['Help desk','Documentation','Client coordination']],
  ['arjun','Arjun Mehta','EMPLOYEE','alpha','Access Control Technician',['Access control','CCTV','Structured cabling','Site survey','Fiber']],
  ['samira','Samira Khan','EMPLOYEE','bravo','Senior Network Engineer',['Network design','Routing and switching','Wi-Fi']],
  ['yousef','Yousef Karim','EMPLOYEE','bravo','Security Systems Engineer',['CCTV','Access control','Fiber']],
  ['rina','Rina Santos','EMPLOYEE','alpha','Network Engineer',['Wi-Fi','Routing and switching','Site survey']],
  ['khalid','Khalid Mansoor','EMPLOYEE','bravo','Field Technician',['Help desk','Structured cabling','Site survey']],
  ['sophia','Sophia Ivanova','EMPLOYEE','shared','Project Coordinator',['Documentation','Client coordination']],
];
export const businesses = [
  ['northstar','Northstar Medical Group','Patient Portal Upgrade','Business Bay office',25.1866,55.2648,'ava','maya','Software development'],
  ['horizon','Horizon Retail Holdings','Retail Network Renewal','DIP warehouse',24.9857,55.1627,'ava','rina','Routing and switching'],
  ['marina','Marina Heights Residences','Access Control Upgrade','Al Quoz workshop',25.1412,55.2241,'ava','cora','Access control'],
  ['vertex','Vertex Logistics','Warehouse Network Refresh','Jebel Ali operations site',24.9850,55.0273,'ben','omar','Routing and switching'],
  ['crestline','Crestline Schools','Campus CCTV Rollout','Sharjah service centre',25.3208,55.4095,'ava','fatima','CCTV'],
  ['cedar','Cedar Finance House','Branch Cloud Migration','Abu Dhabi branch',24.5011,54.3870,'ben','dan','Cloud / DevOps'],
];
export function userId(name) { return ['nora','ava','ben','cora','dan'].includes(name) ? `mock-${name==='nora'?'super-admin':name==='ava'||name==='ben'?'admin':'employee'}-${name}` : `demo-employee-${name}`; }
export function dayOffset(date, days) { const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
export function monthOffset(date, months) { const d=new Date(`${date.slice(0,7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth()+months); return d.toISOString().slice(0,10); }
