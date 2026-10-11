import type { ClipboardEvent, Dispatch, SetStateAction } from "react";

function htmlToReplyText(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  function read(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "meta"].includes(tag)) return "";
    if (tag === "br") return "\n";
    const content = Array.from(node.childNodes).map(read).join("");
    const isBold = ["b", "strong"].includes(tag) ||
      /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(node.getAttribute("style") ?? "");
    const value = isBold && content.trim() ? `**${content.trim()}**` : content;
    if (tag === "li") return `• ${value.trim()}\n`;
    if (["p", "div", "h1", "h2", "h3", "blockquote"].includes(tag)) return `${value.trim()}\n\n`;
    return value;
  }
  return Array.from(document.body.childNodes).map(read).join("")
    .replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function pastePrayerReply(
  event: ClipboardEvent<HTMLTextAreaElement>,
  setMessage: Dispatch<SetStateAction<string>>,
) {
  const html = event.clipboardData.getData("text/html");
  if (!html) return; // Native paste preserves plain-text line breaks.
  const formatted = htmlToReplyText(html);
  if (!formatted) return;
  event.preventDefault();
  const editor = event.currentTarget;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  setMessage(previous => previous.slice(0, start) + formatted + previous.slice(end));
  requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + formatted.length, start + formatted.length); });
}
