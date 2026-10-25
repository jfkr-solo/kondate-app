"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "今日", icon: "🍽️" },
  { href: "/week", label: "1週間", icon: "📅" },
  { href: "/history", label: "履歴", icon: "📖" },
  { href: "/shopping", label: "買い物", icon: "🛒" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "active" : ""}>
          <span className="icon" aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
