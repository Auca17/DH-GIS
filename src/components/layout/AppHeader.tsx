"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DhLogo } from "@/components/brand/DhLogo";

const NAV_LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/freeride", label: "Freeride" },
  { href: "/acerca", label: "Nosotros" },
];

// Shown until the rider types a name on the login screen.
const DEFAULT_RIDER = "Vos";

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getRiderSnapshot(): string {
  try {
    return localStorage.getItem("dh_rider")?.trim() || DEFAULT_RIDER;
  } catch {
    return DEFAULT_RIDER;
  }
}

function getServerRiderSnapshot(): string {
  return DEFAULT_RIDER;
}

// usePathname() is request data: under cacheComponents it must be read inside a
// <Suspense> boundary (see src/app/layout.tsx), otherwise prerendering fails.
export function AppHeader() {
  const pathname = usePathname();
  return <HeaderFrame pathname={pathname} />;
}

// Static header shown while the pathname streams in. No link is marked active.
export function AppHeaderFallback() {
  return <HeaderFrame pathname={null} />;
}

function HeaderFrame({ pathname }: { pathname: string | null }) {
  const rider = useSyncExternalStore(
    subscribeStorage,
    getRiderSnapshot,
    getServerRiderSnapshot,
  );

  const isLogin = pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-xs pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] transition-colors">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={isLogin ? "/" : "/mapa"}
          className="group flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <DhLogo size={32} title="" className="transition-transform duration-150 group-hover:-rotate-6 group-active:scale-95" />
          <span className="font-display text-lg font-bold tracking-tight text-text">DH</span>
          <span className="hidden text-xs font-medium text-text-muted sm:inline-block">
            Descensos medidos
          </span>
        </Link>

        {/* Nav Links */}
        {!isLogin ? (
          <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                pathname !== null &&
                (pathname === href || (href !== "/mapa" && pathname.startsWith(href)));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    isActive
                      ? "border-b-2 border-primary text-text font-bold"
                      : "text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* Rider profile / name */}
        <div className="flex items-center gap-2">
          {!isLogin ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              <span className="font-mono text-xs">{rider}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
