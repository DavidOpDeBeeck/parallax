export type Status = "new" | "changed" | "removed" | "unchanged"

export const styleCss = `
:root {
  color-scheme: light dark;
  --background: #ffffff;
  --ink: #1f2328;
  --muted: #656d76;
  --line: #d0d7de;
  --band: #f6f8fa;
  --new: #1a7f37;
  --changed: #9a6700;
  --removed: #cf222e;
  --unchanged: #656d76;
  --new-tint: #e6f6ea;
  --changed-tint: #fdf4d3;
  --removed-tint: #ffebe9;
  --unchanged-tint: #f6f8fa;
  --marker: #bf3989;
  --marker-tint: #ffeff7;
  --marker-line: #f2b8d4;
}
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0d1117;
    --ink: #e6edf3;
    --muted: #8d96a0;
    --line: #30363d;
    --band: #161b22;
    --new: #3fb950;
    --changed: #d29922;
    --removed: #f85149;
    --unchanged: #8d96a0;
    --new-tint: #12261e;
    --changed-tint: #272115;
    --removed-tint: #2d1517;
    --unchanged-tint: #161b22;
    --marker: #db61a2;
    --marker-tint: #2b1a27;
    --marker-line: #6b2c4f;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px;
  background: var(--background);
  color: var(--ink);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
}
code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 0.9em; }
.sign { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-weight: 600; }
.new { color: var(--new); }
.changed { color: var(--changed); }
.removed { color: var(--removed); }
.unchanged, .muted { color: var(--muted); }
.counts { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 20px; }
.count { padding: 2px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--band); font-weight: 500; white-space: nowrap; }
.count.new { border-color: var(--new); background: var(--new-tint); color: var(--new); }
.count.changed { border-color: var(--changed); background: var(--changed-tint); color: var(--changed); }
.count.removed { border-color: var(--removed); background: var(--removed-tint); color: var(--removed); }
.count.marker { border-color: var(--marker-line); background: var(--marker-tint); color: var(--marker); }
.marker-note {
  margin: 6px 0 0;
  padding: 4px 8px;
  border: 1px solid var(--marker-line);
  border-radius: 4px;
  background: var(--marker-tint);
}
.marker-note .label { color: var(--marker); font-weight: 600; margin-right: 6px; }
`

export const statusSigns: Record<Status, string> = { new: "+", changed: "~", removed: "−", unchanged: "" }
