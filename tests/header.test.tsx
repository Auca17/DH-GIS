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
    expect(html).toContain("DH Leaderboard");
    expect(html).toContain("Mapa");
    expect(html).toContain("Consultas");
    expect(html).toContain("Acerca");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Lucas R.");
  });
});
