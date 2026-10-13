import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";

describe("DbStatusNotice Component", () => {
  it("renders nothing when dbStatus is ok", () => {
    const html = renderToString(<DbStatusNotice dbStatus="ok" />);
    expect(html).toBe("");
  });

  it("renders offline warning notice with role status and without <main>", () => {
    const html = renderToString(<DbStatusNotice dbStatus="offline" />);
    expect(html).toContain("Sin conexión a la base");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<main");
  });

  it("renders empty database alert mentioning npm run seed and without <main>", () => {
    const html = renderToString(<DbStatusNotice dbStatus="empty" />);
    expect(html).toContain("Base de datos vacía");
    expect(html).toContain("npm run seed");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("<main");
  });
});
