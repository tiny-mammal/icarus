/** True when the event target is a text field, so single-key shortcuts must stay inert. */
export function isEditable(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  );
}

/** A bare key press (no Ctrl/Cmd/Alt) outside any text field. */
export function isPlainShortcut(e: KeyboardEvent): boolean {
  return !e.defaultPrevented && !e.altKey && !e.ctrlKey && !e.metaKey && !isEditable(e.target);
}
