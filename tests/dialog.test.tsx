import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { Dialog } from "@/components/ui/Dialog";
import { getFocusableElements, trapFocus } from "@/components/ui/dialog-utils";

describe("Dialog Primitive", () => {
  describe("dialog-utils", () => {
    it("identifies focusable elements and excludes disabled or hidden elements", () => {
      // Mock DOM structure
      const container = {
        querySelectorAll: vi.fn().mockReturnValue([
          {
            hasAttribute: (attr: string) => attr === "disabled",
            getAttribute: () => null,
          },
          {
            hasAttribute: () => false,
            getAttribute: (attr: string) => (attr === "aria-hidden" ? "true" : null),
          },
          {
            id: "valid-btn",
            hasAttribute: () => false,
            getAttribute: () => null,
          },
        ]),
      } as unknown as ParentNode;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(1);
      expect((focusable[0] as unknown as { id: string }).id).toBe("valid-btn");
    });

    it("traps focus forward from last to first element on Tab", () => {
      const firstFocus = vi.fn();
      const lastEl = { focus: vi.fn() } as unknown as HTMLElement;

      const container = {
        querySelectorAll: vi.fn().mockReturnValue([
          {
            focus: firstFocus,
            hasAttribute: () => false,
            getAttribute: () => null,
          },
          {
            focus: lastEl.focus,
            hasAttribute: () => false,
            getAttribute: () => null,
          },
        ]),
        contains: vi.fn().mockReturnValue(true),
      } as unknown as HTMLElement;

      // Mock activeElement as last element
      const activeElement = (container.querySelectorAll as unknown as () => HTMLElement[])()[1];
      vi.stubGlobal("document", { activeElement });

      const preventDefault = vi.fn();
      const tabEvent = {
        key: "Tab",
        shiftKey: false,
        preventDefault,
      } as unknown as KeyboardEvent;

      trapFocus(tabEvent, container);

      expect(preventDefault).toHaveBeenCalled();
      expect(firstFocus).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("traps focus backward from first to last element on Shift+Tab", () => {
      const lastFocus = vi.fn();
      const firstEl = { focus: vi.fn() } as unknown as HTMLElement;

      const container = {
        querySelectorAll: vi.fn().mockReturnValue([
          {
            focus: firstEl.focus,
            hasAttribute: () => false,
            getAttribute: () => null,
          },
          {
            focus: lastFocus,
            hasAttribute: () => false,
            getAttribute: () => null,
          },
        ]),
        contains: vi.fn().mockReturnValue(true),
      } as unknown as HTMLElement;

      const activeElement = (container.querySelectorAll as unknown as () => HTMLElement[])()[0];
      vi.stubGlobal("document", { activeElement });

      const preventDefault = vi.fn();
      const shiftTabEvent = {
        key: "Tab",
        shiftKey: true,
        preventDefault,
      } as unknown as KeyboardEvent;

      trapFocus(shiftTabEvent, container);

      expect(preventDefault).toHaveBeenCalled();
      expect(lastFocus).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("Dialog Component", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <Dialog
          isOpen={false}
          onClose={() => {}}
          titleId="dialog-title"
          title="Modal Test"
        >
          <p>Contenido</p>
        </Dialog>
      );
      expect(html).toBe("");
    });

    it("renders role=dialog, aria-modal, aria-labelledby when isOpen is true", () => {
      const html = renderToString(
        <Dialog
          isOpen={true}
          onClose={() => {}}
          titleId="descenso-modal-title"
          title="Confirmar Descenso"
          description="Verificá los datos antes de enviar"
        >
          <p>Detalles del descenso</p>
        </Dialog>
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="descenso-modal-title"');
      expect(html).toContain('id="descenso-modal-title"');
      expect(html).toContain("Confirmar Descenso");
      expect(html).toContain("Verificá los datos antes de enviar");
      expect(html).toContain("Detalles del descenso");
      expect(html).toContain('aria-label="Cerrar modal"');
    });
  });
});
