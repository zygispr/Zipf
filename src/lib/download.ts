// Saves generated text as a file. Everything stays in memory: an object URL is not a network
// request, so it works under the production CSP (research R2).

export function downloadTextFile(
  content: string,
  filename: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  // Some browsers only follow links that are in the document.
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
