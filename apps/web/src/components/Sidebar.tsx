"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";

const NAV_ITEMS = [
  { href: "/", key: "nav.dashboard", icon: "grid" },
  { href: "/suppliers", key: "nav.suppliers", icon: "truck" },
  { href: "/supplier-discovery", key: "nav.supplierDiscovery", icon: "search" },
  { href: "/supplier-search", key: "nav.supplierSearch", icon: "globe" },
  { href: "/trend-products", key: "nav.trendProducts", icon: "trend" },
  { href: "/products", key: "nav.products", icon: "box" },
  { href: "/best-products", key: "nav.bestProducts", icon: "star" },
  { href: "/import", key: "nav.import", icon: "upload" },
  { href: "/ai-studio", key: "nav.aiStudio", icon: "sparkles" },
  { href: "/storefront", key: "nav.storefront", icon: "store" },
  { href: "/orders", key: "nav.orders", icon: "list" },
  { href: "/analytics", key: "nav.analytics", icon: "chart" },
  { href: "/channels", key: "nav.channels", icon: "link" },
  { href: "/settings", key: "nav.settings", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const common = "w-[18px] h-[18px]";
  switch (name) {
    case "grid":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>;
    case "truck":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M2 7h12v9H2z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.6"/></svg>;
    case "search":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "globe":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="1.4"/></svg>;
    case "trend":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M4 18V6M4 18h16M8 14l3-4 3 2 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "box":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="1.6"/><path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="1.6"/><path d="M12 11v10" stroke="currentColor" strokeWidth="1.6"/></svg>;
    case "star":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 22l2.3-7-6-4.6h7.6L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
    case "upload":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6"/></svg>;
    case "sparkles":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
    case "store":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M3 9l1-5h16l1 5" stroke="currentColor" strokeWidth="1.6"/><path d="M4 9v10h16V9" stroke="currentColor" strokeWidth="1.6"/><path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="1.6"/></svg>;
    case "list":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor"/></svg>;
    case "chart":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M4 19V9M11 19V4M18 19v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "link":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><path d="M9 15l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M11 7l1-1a3.5 3.5 0 015 5l-1 1M13 17l-1 1a3.5 3.5 0 01-5-5l1-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "gear":
      return <svg className={common} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.4 2.5a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.4-2.5a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.3"/></svg>;
    default:
      return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-line bg-surface h-screen sticky top-0">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-semibold text-sm">
            TP
          </div>
          <div>
            <div className="font-semibold text-ink-900 leading-tight">TradePilot AI</div>
            <div className="text-[11px] text-ink-500 leading-tight">{t("app.tagline")}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-ink-700 hover:bg-canvas"
              }`}
            >
              <span className={active ? "text-brand-600" : "text-ink-500"}>
                <Icon name={item.icon} />
              </span>
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-line text-[11px] text-ink-500">
        MVP · v0.1
      </div>
    </aside>
  );
}
