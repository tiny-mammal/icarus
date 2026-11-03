/** Trigger a plain browser download of text content. */
export function downloadText(contents: string, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mime};charset=utf-8` }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
