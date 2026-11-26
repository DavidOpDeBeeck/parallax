---
name: parallax-extension
description: Set parallax up in a project and write its extensions, views that show a reviewer what a change does to one part of a system (an API, a database schema, screens, a workflow, prices, permissions, the code), or change how one shows what changed. Use in a repository with a parallax.config.ts, or when asked to set parallax up, when a part of the system isn't shown yet, or when an extension's views don't show what a reviewer needs.
---

# Set up parallax

More and more code is written by agents and reviewed by a person afterwards. That person needs a clear view of what a
change means for the application, and what that view is depends on the application. Parallax makes it possible to build
those views: the project writes an extension per part of its system, and parallax runs them at two commits and puts
their views on a canvas and in the pull request's comment. It ships no extensions and no styles.

Two things hold for every extension:

- **It's deterministic.** It reads the code and data at each commit and compares them; no model or agent decides what
  changed, summarises it or writes the view. The same change always shows the same way, so the reviewer can trust it.
- **It's made for this application.** The [examples](https://github.com/DavidOpDeBeeck/parallax/tree/main/examples)
  are small on purpose: ideas, not templates.

## 1. Find what to show

Before writing code, ask the user what a reviewer of this application needs to see, and where a wrong change costs the
most. Then choose the form that shows a change in that part best; a list of files is rarely it. A schema as a diagram,
a workflow as the steps it now takes, a pricing rule as prices before and after, permissions as who can now do what,
screens as pictures: let the domain decide.

## 2. Install

```bash
npm install -D github:DavidOpDeBeeck/parallax#main
```

`parallax.config.ts` at the repository root lists the extensions in the order their views are shown:

```ts
export default {extensions: [api({path: "api.yaml"}), screens()]}
```

Keep the extensions in a folder of their own (`parallax/`, say), with the shared look and helpers apart from them.
Config and extensions are TypeScript or `.tsx` and run without a build. Render views any way you like; Preact with
`preact-render-to-string` works, with `/** @jsxImportSource preact */` at the top of each `.tsx`.

## 3. The look

Build the look before the first view, from the project's own style (a style guide, design tokens, CSS variables, a
theme config), and agree it with the user. A view of its own that shows every part with sample data makes it easy to
review, and shows the look again when a change touches it.

So that views read as one picture:

- One colour per meaning (new, changed, removed, a reason to look), the same in every view, light and dark; the rest
  stays quiet. Without a project style: new `#1a7f37`/`#3fb950`, changed `#9a6700`/`#d29922`, removed
  `#cf222e`/`#f85149`, a reason to look `#bf3989`/`#db61a2` (light/dark).
- Lead with what needs a look, then the counts.
- Show what a reviewer needs and fold the rest ("10 more files"). Numbers and names, not adjectives.

## 4. An extension per part

```ts
import type {SnapshotExtension} from "parallax"

export function api({path}: ApiOptions): SnapshotExtension<ApiSnapshot, ApiDelta> {
    return {
        name: "api",
        extract: (checkout) => extractApi(checkout, path), // one commit → a snapshot, plain JSON
        compare: compareApi, // two snapshots → a delta, or undefined when nothing changed
        show: (delta) => [{title: "API", html: apiPage(delta)}], // a delta → views
    }
}
```

- **extract** reads one commit the way the project builds that part: its build, migrations, its own export. Same
  commit, same snapshot: sorted, no times, absolute paths or random ids.
- **compare** says what changed in the part's own words, with old values where something changed and a reason where a
  reviewer must look (`breaking`: "`owner` was required").
- **show** builds views from the look. Same delta, same HTML.
- When git itself is the source, such as lines added, use `CommitsExtension`: `compareCommits(change)` gets both
  commits at once.
- Snapshot and delta are `type` aliases of plain data; an `interface` doesn't satisfy parallax's `Json`.

A view's page loads nothing from the network, is 880 pixels wide and grows down, follows `prefers-color-scheme`, and
sets its own body margin and background. Parallax heads it with its title.

On the canvas a view is a small application: it may run scripts to expand, filter or click through, as long as it's the
same on every load. In the comment it's a picture of the page once loaded, so the loaded page alone must show the change.

## 5. Run it

```bash
npx parallax --base origin/main --head HEAD --open
```

It reads commits, so commit first. It writes `.parallax/<base>-<head>/` (add `.parallax/` to `.gitignore`): a page per
view, `canvas.html` and `change.json`.

- Draw a change that touches the part, and one that doesn't: that one says "no change".
- Look at every view light and dark, as a reviewer would.
- Extract one commit twice: the snapshots must be equal.

## 6. On pull requests

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

`npm ci` installs what the views load; use the project's own install command. `attach-token` is a person's or bot
account's token that can push to the repository (with Contents Read and Write permission); it attaches the pictures to the comment. Steps an extension needs (a browser, Docker, a JDK) go before
the action.

## Pitfalls

- **A checkout has no `node_modules` or build.** Run the project's steps from the working checkout, pointed at the
  commit's checkout, or install what they need in it first.
- **Extensions run from the working checkout** for both commits, so changing an extension still compares two snapshots
  made the same way.
- **A font, stylesheet or script from a URL** is missing from the picture: carry it in the page, or use system fonts.
