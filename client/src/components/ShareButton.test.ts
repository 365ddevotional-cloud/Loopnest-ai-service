import assert from "node:assert/strict";
import { test } from "node:test";
import React, { act } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://365dailydevotional.com" });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "Node", "NodeFilter", "MutationObserver", "CustomEvent", "getComputedStyle"]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: (dom.window as any)[name] });
}
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout });
// Radix determines browser support at import time, so initialize the DOM first.
const { createRoot } = await import("react-dom/client");
const { ShareButton } = await import("./ShareButton");
const fullText = "Full devotional, scripture, prayer points, declarations, and author.";
const url = "https://365dailydevotional.com/devotional/2026-11-03";

async function mount(share: unknown) {
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(ShareButton, { title: "Heavenly Peace", text: fullText, url })));
  return {
    button: container.querySelector('[data-testid="button-share"]') as HTMLButtonElement,
    container,
    async close() { await act(async () => root.unmount()); container.remove(); },
  };
}

test("native sharing starts in the click event and repeated taps cannot overlap", async () => {
  const calls: ShareData[] = [];
  let resolve!: () => void;
  const view = await mount((data: ShareData) => { calls.push(data); return new Promise<void>(r => { resolve = r; }); });
  const click = new dom.window.MouseEvent("click", { bubbles: true });
  await act(async () => {
    view.button.dispatchEvent(click);
    assert.equal(calls.length, 1, "no fetch or timer should precede navigator.share");
    view.button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    assert.equal(calls.length, 1);
  });
  assert.deepEqual(calls[0], { title: "Heavenly Peace", text: "Heavenly Peace", url });
  assert.equal(view.button.disabled, true);
  await act(async () => resolve());
  assert.equal(view.button.disabled, false, "no artificial two-second delay after sharing");
  await view.close();
});

test("native failure immediately exposes working alternatives and preserves full-text sharing", async () => {
  const calls: ShareData[] = [];
  const view = await mount(async (data: ShareData) => {
    calls.push(data);
    if (calls.length === 1) throw new DOMException("Blocked", "NotAllowedError");
  });
  await act(async () => view.button.click());
  assert.match(document.body.textContent || "", /Phone sharing could not open/);
  const whatsapp = document.querySelector('[data-testid="share-whatsapp"]') as HTMLAnchorElement;
  assert.equal(new URL(whatsapp.href).searchParams.get("text"), `Heavenly Peace\n\n${url}`);
  await act(async () => (document.querySelector('[data-testid="share-full-text"]') as HTMLElement).click());
  assert.deepEqual(calls[1], { title: "Heavenly Peace", text: fullText });
  await view.close();
});

test("cancelling native share is neutral and leaves the button available", async () => {
  const view = await mount(async () => { throw new DOMException("Cancelled", "AbortError"); });
  await act(async () => view.button.click());
  assert.equal(view.button.disabled, false);
  assert.doesNotMatch(view.container.textContent || "", /could not|Failed|Opened/);
  assert.equal(document.querySelector('[role="menu"]'), null);
  await view.close();
});

test("without native sharing the menu offers quick links and can copy the full devotional", async () => {
  let copied = "";
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { copied = value; } } });
  const view = await mount(undefined);
  await act(async () => view.button.click());
  assert.ok(document.querySelector('[data-testid="share-email"]'));
  await act(async () => (document.querySelector('[data-testid="share-copy-text"]') as HTMLElement).click());
  assert.equal(copied, fullText);
  assert.match(view.container.textContent || "", /Copied/);
  await view.close();
});
