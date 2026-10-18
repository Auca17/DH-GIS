import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AppHeader } from "@/components/layout/AppHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/mapa",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AppHeader", () => {
  it("renders DH wordmark and navigation links with active aria-current", () => {
    const html = renderToString(<AppHeader />);
    expect(html).toContain("DH");
    expect(html).toContain("Mapa");
    expect(html).toContain("Nosotros");
    // The query panel link stays hidden until /consultas exists.
    expect(html).not.toContain("Consultas");
    expect(html).toContain('aria-current="page"');
    // Signed out (no SessionProvider in this test): the sign-in link.
    expect(html).toContain("Ingresar");
  });
});
