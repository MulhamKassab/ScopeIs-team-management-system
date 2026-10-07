import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}><span className="logo-surface"><Image src="/brand/scopeis-logo.png" alt="SCOPE Information Systems" width={120} height={40} priority /></span>{!compact && <span className="product-name">Team Management</span>}</div>;
}
