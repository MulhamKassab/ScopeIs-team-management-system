/** Names and system roles are confirmed; all business facts and qualifications are fictional. */
export const workforce = [
  ['nora','Raafat','SUPER_ADMIN','operations','Account Manager',['Client coordination','Documentation']],
  ['hanna','Hanna','SUPER_ADMIN','operations',null,[]],
  ['ava','Saber','ADMIN','operations','Senior Network Engineer',['Network design','Routing and switching','Wi-Fi']],
  ['ben','Thamer','ADMIN','operations','Project Coordinator',['Client coordination','Documentation','Site survey']],
  ['cora','Mulham','EMPLOYEE','operations','Security Systems Engineer',['CCTV','Access control','Site survey','Software development','Routing and switching']],
  ['dan','Ahmad','EMPLOYEE','operations','Cloud / DevOps Engineer',['Cloud / DevOps','Database support','Documentation','CCTV']],
  ['omar','Omar','EMPLOYEE','operations','Network Engineer',['Routing and switching','Wi-Fi','Fiber','Access control']],
];
export const loginNames={nora:'raafat',hanna:'hanna',ava:'saber',ben:'thamer',cora:'mulham',dan:'ahmad',omar:'omar'};
export const skillCatalog=['Client coordination','Documentation','Network design','Routing and switching','Wi-Fi','CCTV','Access control','Site survey','Cloud / DevOps','Database support','Software development','Structured cabling','Fiber','Precision cooling / HVAC','Help desk'];
export const visitTimes={northstar:['09:00','11:00'],horizon:['09:00','11:00'],marina:['11:00','13:00'],vertex:['13:00','15:00'],crestline:['09:00','11:00'],cedar:['11:00','13:00']};
export const businesses = [
  ['northstar','Northstar Medical Group','Patient Portal Upgrade','Business Bay office',25.1866,55.2648,'ava','cora','Software development'],
  ['horizon','Horizon Retail Holdings','Retail Network Renewal','DIP warehouse',24.9857,55.1627,'ava','omar','Routing and switching'],
  ['marina','Marina Heights Residences','Access Control Upgrade','Al Quoz workshop',25.1412,55.2241,'ava','cora','Access control'],
  ['vertex','Vertex Logistics','Warehouse Network Refresh','Jebel Ali operations site',24.9850,55.0273,'ben','omar','Routing and switching'],
  ['crestline','Crestline Schools','Campus CCTV Rollout','Sharjah service centre',25.3208,55.4095,'ava','dan','CCTV'],
  ['cedar','Cedar Finance House','Branch Cloud Migration','Abu Dhabi branch',24.5011,54.3870,'ben','dan','Cloud / DevOps'],
];
// Existing keys are opaque stable identifiers: renaming a person never changes foreign keys.
export function userId(name) { return name==='hanna'?'demo-super-admin-hanna':['nora','ava','ben','cora','dan'].includes(name) ? `mock-${name==='nora'?'super-admin':name==='ava'||name==='ben'?'admin':'employee'}-${name}` : `demo-employee-${name}`; }
export function dayOffset(date, days) { const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
export function monthOffset(date, months) { const d=new Date(`${date.slice(0,7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth()+months); return d.toISOString().slice(0,10); }
