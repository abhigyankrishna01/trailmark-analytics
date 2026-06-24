"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Sessions", exact: true },
  { href: "/dashboard/heatmap", label: "Heatmap", exact: false },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <Link href="/dashboard" className="logo" style={{ color: "var(--text)" }}>
          Trail<span>mark</span>
        </Link>
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav${active ? " active" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
        <span className="spacer" />
        <a className="nav" href="/demo.html">
          Demo store ↗
        </a>
      </div>
    </div>
  );
}
