import { afterEach, describe, expect, it, vi } from "vitest";
import { setupLanguageSwitchers } from "./language-switcher";

describe("docs language switcher", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("follows the pre-rendered destination for a supported locale", () => {
    document.body.innerHTML = `
      <select data-language-switcher>
        <option value="en">English</option>
        <option value="es" selected>Español</option>
      </select>
      <a data-language-destination="es" href="${window.location.origin}/es/privacy/">Español</a>
    `;
    const destination = requireElement<HTMLAnchorElement>("[data-language-destination]");
    const click = vi.spyOn(destination, "click").mockImplementation(() => undefined);

    setupLanguageSwitchers();
    requireElement<HTMLSelectElement>("select").dispatchEvent(new Event("change"));

    expect(click).toHaveBeenCalledOnce();
  });

  it("rejects external and executable destinations", () => {
    document.body.innerHTML = `
      <select data-language-switcher>
        <option value="es" selected>Español</option>
      </select>
      <a data-language-destination="es" href="javascript:alert(1)">Unsafe</a>
    `;
    const destination = requireElement<HTMLAnchorElement>("[data-language-destination]");
    const click = vi.spyOn(destination, "click").mockImplementation(() => undefined);

    setupLanguageSwitchers();
    requireElement<HTMLSelectElement>("select").dispatchEvent(new Event("change"));

    expect(click).not.toHaveBeenCalled();

    destination.href = "https://example.com/es/";
    requireElement<HTMLSelectElement>("select").dispatchEvent(new Event("change"));

    expect(click).not.toHaveBeenCalled();
  });

  it("ignores locale values outside the supported locale list", () => {
    document.body.innerHTML = `
      <select data-language-switcher>
        <option value="unknown" selected>Unknown</option>
      </select>
      <a data-language-destination="unknown" href="${window.location.origin}/unknown/">Unknown</a>
    `;
    const destination = requireElement<HTMLAnchorElement>("[data-language-destination]");
    const click = vi.spyOn(destination, "click").mockImplementation(() => undefined);

    setupLanguageSwitchers();
    requireElement<HTMLSelectElement>("select").dispatchEvent(new Event("change"));

    expect(click).not.toHaveBeenCalled();
  });
});

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Expected element matching ${selector}`);
  return element;
}
