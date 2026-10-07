import { IconAlertTriangle, IconCheck, IconChevronRight, IconCircleX, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

export function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" | "grey" | "purple" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Status({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" | "grey" }) {
  const Icon = tone === "green" ? IconCheck : tone === "red" ? IconCircleX : tone === "amber" ? IconAlertTriangle : IconInfoCircle;
  return <span className={`status status-${tone}`}><Icon size={14} aria-hidden="true" />{children}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="page-heading"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p className="page-description">{description}</p> : null}</div>{actions ? <div className="page-actions">{actions}</div> : null}</header>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <section className="empty-state" role="status"><IconInfoCircle size={30} aria-hidden="true" /><h2>{title}</h2><p>{body}</p>{action}</section>;
}

export function Modal({ open, title, description, onClose, children, actions }: { open: boolean; title: string; description?: string; onClose: () => void; children?: React.ReactNode; actions?: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><button ref={closeRef} className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><IconX size={20} /></button><h2 id="modal-title">{title}</h2>{description ? <p>{description}</p> : null}{children}<div className="modal-actions">{actions}</div></section></div>;
}

export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return <aside className="drawer" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><IconX size={20} /></button></header><div className="drawer-body">{children}</div>{footer ? <footer>{footer}</footer> : null}</aside>;
}

export function DataTable({ headers, rows, label }: { headers: string[]; rows: React.ReactNode[][]; label: string }) {
  return <div className="table-wrap" role="region" aria-label={label} tabIndex={0}><table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((cells, rowIndex) => <tr key={rowIndex}>{cells.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row">{cell}</th> : <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function TabBar({ tabs, current, onChange }: { tabs: string[]; current: string; onChange: (tab: string) => void }) {
  return <div className="tab-bar" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={current === tab} onClick={() => onChange(tab)}>{tab}</button>)}</div>;
}

export function DetailList({ items }: { items: [string, React.ReactNode][] }) {
  return <dl className="detail-list">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function InlineLink({ children }: { children: React.ReactNode }) {
  return <span className="inline-link">{children}<IconChevronRight size={14} aria-hidden="true" /></span>;
}
