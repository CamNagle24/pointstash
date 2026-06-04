import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The content script is a self-running IIFE (not a module). We eval its source
// against the current jsdom globals so a refactor that breaks the headline
// "scroll to the exact offer" behavior is caught here.
const SCRIPT = readFileSync(
  resolve(process.cwd(), "extension/src/scroll-to-deal.js"),
  "utf8",
);

function runScript() {
  // eslint-disable-next-line no-new-func
  new Function(SCRIPT)();
}

function highlighted(): Element | null {
  return document.querySelector(".ps-deal-highlight");
}

function setHash(value: string) {
  window.location.hash = value;
}

describe("scroll-to-deal content script", () => {
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = "";
    // The script injects a <style> into <head>; clear it between runs.
    document.getElementById("ps-deal-style")?.remove();
    setHash("");
    // jsdom does no layout, so getClientRects() is empty and getBoundingClientRect()
    // is all-zero by default — that would make every element read as invisible.
    // Stub both so isVisible() passes and the highlight-wrapper climb (height >= 60)
    // behaves like a real page.
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      { width: 200, height: 80 },
    ] as unknown as DOMRectList);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 200,
      height: 80,
      top: 0,
      left: 0,
      right: 200,
      bottom: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    if (typeof Element.prototype.scrollIntoView !== "function") {
      Element.prototype.scrollIntoView = () => {};
    }
    scrollSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("scrolls to and highlights the element matching the #ps-deal title", () => {
    document.body.innerHTML = `
      <div style="height:1500px">spacer</div>
      <section>
        <div class="offer"><h3>Free Coffee Monday</h3><p>any size</p></div>
        <div class="offer"><h3>Free Fries Friday</h3><p>with $1 purchase</p></div>
        <div class="offer"><h3>BOGO Burgers</h3><p>members only</p></div>
      </section>`;
    setHash("#ps-deal=" + encodeURIComponent("Free Fries Friday"));

    runScript();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(document.getElementById("ps-deal-style")).not.toBeNull();
    const el = highlighted();
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain("Free Fries Friday");
    // Precision: it must not light up a sibling offer.
    expect(el!.textContent).not.toContain("Free Coffee");
  });

  it("does nothing when there is no #ps-deal fragment", () => {
    document.body.innerHTML = `<h3>Free Fries Friday</h3>`;
    setHash("#section=offers");

    runScript();

    expect(scrollSpy).not.toHaveBeenCalled();
    expect(document.getElementById("ps-deal-style")).toBeNull();
    expect(highlighted()).toBeNull();
  });

  it("matches case-insensitively and decodes the fragment", () => {
    document.body.innerHTML = `<div><span>$1 Dave's Single</span></div>`;
    setHash("#ps-deal=" + encodeURIComponent("$1 dave's single"));

    runScript();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(highlighted()!.textContent).toContain("$1 Dave's Single");
  });

  it("finds an element that renders in late, via the poll", () => {
    vi.useFakeTimers();
    setHash("#ps-deal=" + encodeURIComponent("Late Offer"));

    runScript(); // nothing matching is in the DOM yet
    expect(scrollSpy).not.toHaveBeenCalled();

    const el = document.createElement("div");
    el.textContent = "Late Offer";
    document.body.appendChild(el);

    vi.advanceTimersByTime(600); // one POLL_INTERVAL_MS tick
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(highlighted()).not.toBeNull();
  });
});
