---
name: parallax-extension
description: Set parallax up in a project and write its extensions, for a part of a system (an API, a database schema, message flows, screens, dependencies, the code), or change how one shows what changed. Use in a repository with a parallax.config.ts, or when asked to set parallax up, when a part of the system isn't shown yet, or when an extension's views don't show what a reviewer needs.
---

# Set up parallax

Parallax compares two commits and shows what changed: each extension reads one part of the system at both commits and
shows the difference as a page of HTML. Parallax runs them, and puts their views on a canvas and in a pull request's
comment. It ships no extensions and no styles; the project writes both. For ideas, see
https://github.com/DavidOpDeBeeck/parallax/tree/main/examples.

## 1. Install

```bash
npm install -D github:DavidOpDeBeeck/parallax#main preact preact-render-to-string
```

```
parallax.config.ts          export default { extensions: [design(), api({ path: "api.yaml" })] }
parallax/
  design/                   the look every view is built from, and the design extension
  tools/                    helpers, once two extensions need one
  api/api.tsx               one folder per extension, one file until it passes about 200 lines
```

- Extensions use `design/` and `tools/`; those know nothing of extensions, and extensions don't import each other.
- Views are Preact rendered to a string. Each `.tsx` starts with `/** @jsxImportSource preact */`; parallax reads it
  as it is, with nothing to build.
- A big view (cards, a contact sheet, a map of files) stays in its extension until a second one needs it.

## 2. The design

Build the look first and have the user approve it, so every view is built from agreed parts.

1. **Find the project's look**: a style guide, design tokens, CSS variables, a Tailwind or theme config. Map it onto
   the jobs below (its success colour is new, its danger colour removed). Without one, use the default palette.
2. **Write `parallax/design/`**:
   - `style.ts`: the `Status` type (`new`, `changed`, `removed`, `unchanged`), the signs, and the base CSS: the
     palette as CSS variables for light and dark, body margin, background and fonts.
   - `page.tsx`: renders a view's page to a string, base CSS first, then the view's own.
   - `counts.tsx`: the line that starts every view.
   - `design.tsx`: every part with sample data, and the `design()` extension. Its `compareCommits` runs
     `git diff --name-status` on `parallax/design` and returns each changed file with its status (added is new,
     deleted removed, anything else changed), or `undefined`; its `show` gives one view, "Design": the counts, the
     files, then every part.
3. **Add `design()`** to `parallax.config.ts`, commit, and run parallax (step 4). Review the Design view with the user,
   light and dark, until they agree.

A pull request that changes `parallax/design/` then shows the design again. A new part gets a section in `design.tsx`.

**Rules**, the same in every project so views read as one picture:

- One colour per job: new, changed, removed, a reason to look; everything else ink and grey, the same in light and dark.
- Only `+` new, `~` changed and `−` removed have a sign; anything else is words ("2 breaking").
- A view starts with its counts: reasons to look, then new, changed and removed, then facts ("+121 −42 lines").
- Read like a diff: new tinted green, removed red, unchanged grey; a changed value as the line it was and the line it
  is. A reason to look sits under what it concerns, with its reason.
- Names in monospace, prose in sans-serif, thin lines, no shadows. Numbers and names, not adjectives; never "risky".
- Only what a reviewer needs: fold the rest into a line ("10 more files").

| Job | Light | Dark | Tint light | Tint dark |
|---|---|---|---|---|
| background | `#ffffff` | `#0d1117` | | |
| ink | `#1f2328` | `#e6edf3` | | |
| muted, unchanged | `#656d76` | `#8d96a0` | `#f6f8fa` | `#161b22` |
| line | `#d0d7de` | `#30363d` | | |
| new | `#1a7f37` | `#3fb950` | `#e6f6ea` | `#12261e` |
| changed | `#9a6700` | `#d29922` | `#fdf4d3` | `#272115` |
| removed | `#cf222e` | `#f85149` | `#ffebe9` | `#2d1517` |
| reason to look | `#bf3989` | `#db61a2` | `#ffeff7` | `#2b1a27` |

## 3. An extension per part

```ts
import type { SnapshotExtension } from "parallax"

export function api({ path }: ApiOptions): SnapshotExtension<ApiSnapshot, ApiDelta> {
  return {
    name: "api",
    extract: (checkout) => extractApi(checkout, path), // one commit → a snapshot, plain JSON
    compare: compareApi, // two snapshots → a delta, or undefined when nothing changed
    show: (delta) => [{ title: "API", html: apiPage(delta) }], // a delta → views
  }
}
```

- **extract** reads one commit the way the project builds that part: its build, migrations, its own export. Same
  commit, same snapshot: sorted, no times, absolute paths or random ids.
- **compare** says what changed in this part's own words: each thing with its status, the old value of what changed,
  and a marker with its reason where a reviewer must look (`breaking`: "`owner` was required").
- **show** builds each view from the design. The same delta gives the same HTML.
- When the part is git's own comparison, such as lines added, use `CommitsExtension`: `compareCommits(change)` gets
  both commits at once.
- Snapshot and delta are `type` aliases of plain data; an `interface` doesn't satisfy parallax's `Json`.
- `extract` and `compare` know nothing of HTML; a delta may use the design's `Status`, nothing else of it.

Ask which part to show and what its reviewer needs first, then add it to the config in the order views should come.

A page is self-contained (nothing loaded from the network), 880 pixels wide and growing down, follows
`prefers-color-scheme`, and sets its own body margin and background. It doesn't repeat its title: parallax heads it.

## 4. Run it

```bash
npx parallax --base origin/main --head HEAD --open
```

It reads commits, so commit first; extensions run from the working checkout as they are. It writes
`.parallax/<base>-<head>/` (add `.parallax/` to `.gitignore`): a page per view, `canvas.html` and `change.json`.

- Draw a change that touches the part, and one that doesn't: that one says "no change".
- Look at every view light and dark, as a reviewer would.
- Extract one commit twice: the snapshots must be equal.

## 5. On pull requests

```yaml
on: pull_request
concurrency:
  group: parallax-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  parallax:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - run: npm ci
      - uses: DavidOpDeBeeck/parallax@main
        with:
          attach-token: ${{ secrets.PARALLAX_ATTACH_TOKEN }}
```

`npm ci` installs the project's packages, Preact among them, which the views load; use the project's own install
command. `attach-token` is a person's or bot account's token that can push to the repository; it attaches the pictures to
the comment. Steps an extension needs (a browser, Docker, a JDK) go before the action.

## Pitfalls

- **A checkout has no `node_modules` or build.** Run the project's steps from the working checkout, pointed at the
  commit's checkout, or install what they need in it first.
- **Extensions run from the working checkout** for both commits, so changing an extension still compares two snapshots
  made the same way.
- **A font, stylesheet or script from a URL** is missing from the picture: carry it in the page, or use system fonts.
