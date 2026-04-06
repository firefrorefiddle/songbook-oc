/**
 * Pull human-readable LaTeX failure text out of a .log file so the UI is not stuck with
 * generic "Command failed: pdflatex ..." messages from child_process.
 */

export function extractPdflatexUserMessage(log: string): string {
  const trimmed = log.trimEnd();
  const lines = trimmed.split(/\r?\n/);

  const bangIdx = lines.findIndex((line) => /^!/.test(line));
  if (bangIdx === -1) {
    return tailForFallback(trimmed);
  }

  const chunk: string[] = [];
  for (let i = bangIdx; i < lines.length && chunk.length < 30; i++) {
    const line = lines[i];
    chunk.push(line);
    // Stop after file/line marker plus a little context (common LaTeX error shape)
    if (/^l\.\d+/.test(line) && chunk.length >= 2) {
      const rest = lines.slice(i + 1, i + 4).filter((l) => l.trim().length > 0);
      chunk.push(...rest.slice(0, 2));
      break;
    }
  }

  return chunk.join("\n").trim() || tailForFallback(trimmed);
}

function tailForFallback(log: string): string {
  return log.length > 6000 ? `…\n${log.slice(-6000)}` : log;
}
