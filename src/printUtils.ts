// Print helper — creates a Blob URL and opens it in a new tab (no popup blocker, no size limit)
export function openPrintWindow(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => {
      URL.revokeObjectURL(url);
      w.print();
    };
    // Fallback cleanup
    setTimeout(() => {
      try { if (w.closed) URL.revokeObjectURL(url); } catch (e) {}
    }, 10000);
  }
}
