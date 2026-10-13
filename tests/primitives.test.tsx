import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";

describe("UI Primitives", () => {
  describe("Button", () => {
    it("renders children without forced uppercase", () => {
      const html = renderToString(<Button>Guardar Descenso</Button>);
      expect(html).toContain("Guardar Descenso");
      expect(html).not.toContain("uppercase");
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-text");
    });

    it("renders secondary and danger variants with white text", () => {
      const secHtml = renderToString(<Button variant="secondary">Acción</Button>);
      expect(secHtml).toContain("bg-secondary");
      expect(secHtml).toContain("text-white");

      const dangerHtml = renderToString(<Button variant="danger">Borrar</Button>);
      expect(dangerHtml).toContain("bg-danger");
      expect(dangerHtml).toContain("text-white");
    });

    it("renders loading state with aria-busy and spinner", () => {
      const html = renderToString(<Button loading>Guardando</Button>);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain("disabled");
      expect(html).toContain("animate-spin");
    });
  });

  describe("Card", () => {
    it("renders rounded-xl container with content", () => {
      const html = renderToString(<Card><p>Contenido</p></Card>);
      expect(html).toContain("rounded-xl");
      expect(html).toContain("Contenido");
    });
  });

  describe("Input", () => {
    it("renders required label linked to input", () => {
      const html = renderToString(<Input id="nombre" label="Nombre del corredor" />);
      expect(html).toContain('for="nombre"');
      expect(html).toContain('id="nombre"');
      expect(html).toContain("Nombre del corredor");
    });

    it("renders error with role alert and aria-invalid", () => {
      const html = renderToString(
        <Input id="email" label="Correo" error="El campo es obligatorio" />
      );
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('role="alert"');
      expect(html).toContain("El campo es obligatorio");
    });
  });

  describe("Textarea", () => {
    it("renders label and character counter", () => {
      const html = renderToString(
        <Textarea
          id="opinion"
          label="Tu opinión"
          maxLength={200}
          showCounter
          value="Excelente sendero"
        />
      );
      expect(html).toContain("Tu opinión");
      expect(html).toContain("17/200");
    });
  });

  describe("Badge", () => {
    it("renders difficulty badge with text label and color dot", () => {
      const html = renderToString(<Badge variant="difficulty" difficulty="dificil" />);
      expect(html).toContain("Difícil");
      expect(html).toContain("background-color:#dc2626");
    });

    it("renders MODO DEMO badge", () => {
      const html = renderToString(<Badge variant="demo" />);
      expect(html).toContain("MODO DEMO");
    });
  });

  describe("Stat", () => {
    it("renders technical stat with font-mono value and unit", () => {
      const html = renderToString(
        <Stat label="Velocidad media" value="34.2" unit="km/h" />
      );
      expect(html).toContain("Velocidad media");
      expect(html).toContain("34.2");
      expect(html).toContain("km/h");
      expect(html).toContain("font-mono");
    });
  });

  describe("Notice", () => {
    it("renders info with role=status and error with role=alert", () => {
      const infoHtml = renderToString(<Notice variant="info">Información técnica</Notice>);
      expect(infoHtml).toContain('role="status"');

      const errorHtml = renderToString(<Notice variant="error">Fallo de conexión</Notice>);
      expect(errorHtml).toContain('role="alert"');
      expect(errorHtml).toContain("Fallo de conexión");
    });
  });

  describe("Skeleton", () => {
    it("renders accessible loading placeholder with role status", () => {
      const html = renderToString(<Skeleton className="h-6 w-32" />);
      expect(html).toContain('role="status"');
      expect(html).toContain("Cargando...");
      expect(html).toContain("animate-pulse");
    });
  });
});
