import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import NotFound from "@/app/not-found";
import RootError from "@/app/error";
import RootLoading from "@/app/loading";
import TrailNotFound from "@/app/cerro/[id]/not-found";
import TrailError from "@/app/cerro/[id]/error";
import TrailLoading from "@/app/cerro/[id]/loading";

describe("Route State Components", () => {
  it("renders root not-found with Spanish copy and map link", () => {
    const html = renderToString(<NotFound />);
    expect(html).toContain("Página no encontrada");
    expect(html).toContain("Volver al mapa");
    expect(html).toContain('href="/mapa"');
  });

  it("renders root error boundary with Reintentar button", () => {
    const reset = vi.fn();
    const error = new Error("Test error");
    const html = renderToString(<RootError error={error} reset={reset} />);
    expect(html).toContain("Algo salió mal");
    expect(html).toContain("Reintentar");
  });

  it("renders root loading UI with accessible status", () => {
    const html = renderToString(<RootLoading />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando");
  });

  it("renders trail not-found with trail-specific Spanish copy", () => {
    const html = renderToString(<TrailNotFound />);
    expect(html).toContain("Sendero no encontrado");
    expect(html).toContain("Volver a los senderos");
    expect(html).toContain('href="/mapa"');
  });

  it("renders trail error with Reintentar button", () => {
    const reset = vi.fn();
    const error = new Error("Trail fetch failure");
    const html = renderToString(<TrailError error={error} reset={reset} />);
    expect(html).toContain("Error en el sendero");
    expect(html).toContain("Reintentar");
  });

  it("renders trail loading skeleton with map and stats placeholders", () => {
    const html = renderToString(<TrailLoading />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando mapa del trazado...");
  });
});
