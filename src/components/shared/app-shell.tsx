"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Music2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useActiveChild } from "@/lib/store/app-store";

const NAV = [
  { href: "/", label: "Today", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/library", label: "Songs", icon: Music2 },
  { href: "/parent", label: "Grown-ups", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Standard page chrome with a bottom nav (tablet-first). Session and onboarding pages don't use it. */
export function AppShell({ children, title, wide }: { children: React.ReactNode; title?: string; wide?: boolean }) {
  const pathname = usePathname();
  const child = useActiveChild();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b-2 bg-background/90 backdrop-blur">
        <div className={cn("mx-auto flex h-14 items-center gap-3 px-4", wide ? "max-w-7xl" : "max-w-5xl")}>
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span aria-hidden>🎹</span> KeyCadence
          </Link>
          {title && <span className="text-muted-foreground">/ {title}</span>}
          {child && (
            <div className="ml-auto flex items-center gap-3 text-sm font-bold">
              <span title="XP">⭐ {child.xp}</span>
              <span title="Stars">✨ {child.stars}</span>
              <span title="Keys">🗝️ {child.keys}</span>
              <span title="Streak">🔥 {child.streak.current}</span>
            </div>
          )}
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-5 pb-24", wide ? "max-w-7xl" : "max-w-5xl")}>{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t-2 bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl justify-around">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} className={cn("flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-bold text-muted-foreground", active && "text-primary")}>
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
