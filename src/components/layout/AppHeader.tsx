"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, Moon, Sun, UserRound } from "lucide-react";
import { DhLogo } from "@/components/brand/DhLogo";
import { useSesion } from "@/providers/session-provider";

const NAV_LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/freeride", label: "Freeride" },
  { href: "/acerca", label: "Nosotros" },
];

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
  // Signed in: link to "Mi perfil". Signed out: link to the sign-in screen.
  const { usuario } = useSesion();

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
                  className={`rounded px-2 py-1.5 text-sm font-semibold sm:px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    isActive
                      ? "border-b-2 border-primary text-primary font-bold"
                      : "text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* Rider profile / name + Theme Toggle */}
        <div className="flex items-center gap-2">
          {isLogin ? null : usuario ? (
            // On phones only the icon shows: with the name the header did not fit in 390 px.
            <Link
              href="/perfil"
              title="Mi perfil"
              className="flex max-w-56 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary shadow-xs sm:px-3"
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden truncate font-mono text-xs text-text sm:inline">{usuario.nombre}</span>
              <span className="sr-only sm:hidden">Mi perfil</span>
            </Link>
          ) : (
            <Link
              href="/"
              title="Ingresar"
              className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary shadow-xs sm:px-3"
            >
              <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Ingresar</span>
              <span className="sr-only sm:hidden">Ingresar</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dh_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("dh_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dh_theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Alternar tema claro/oscuro"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text hover:bg-surface-muted transition-colors cursor-pointer"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-text-muted" />
      )}
    </button>
  );
}
