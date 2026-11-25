# How parallax behaves

An **extension** reads its part of the system at both commits, says what changed, and shows it as HTML. The **core**
finds the two commits, runs the extensions, and puts their views on the canvas and in the comment. The core gives an
extension nothing to build with: no elements, components, styles or helpers.

## Promises

1. **Views are built from code at two commits.** Extensions read the system the way the project builds it; there is no
   hand-maintained model.
2. **The same two commits give the same views**, byte for byte. Nothing depends on the time, the machine or the pull
   request.
3. **Each page is shown as written.** The core never adds, hides, restyles or judges anything. Each page runs in its
   own sandboxed frame, so its styles and scripts reach nothing else.
4. **No extension is left out silently.** If one fails, the run fails, writes nothing, and names the extension and the
   commit.

## An extension

A name and three functions, made by a function that takes the extension's options. See [the
examples](../examples/README.md).

- **extract** gets a checkout of one commit and returns its **snapshot**. It may run any program, the project's build
  included, and knows nothing of the other commit.
- **compare** gets both snapshots and returns the **delta**, or nothing when nothing changed. The core keeps the delta
  and never reads it.
- **show** gets the delta and returns one or more **views**.

All three are deterministic: a snapshot is plain JSON, sorted, with no times, absolute paths or random ids. A function
that fails throws.

An extension whose source is git itself, such as lines added and removed, replaces extract and compare with
`compareCommits(change)`, which gets both commits at once.

### The view

```ts
type View = { title: string; html: string }
```

The page in `html`:

- is rendered to a string any way the extension likes;
- loads nothing, so it opens the same anywhere, offline included;
- is 880 pixels wide and grows down, so a comment shows its picture at real size;
- follows `prefers-color-scheme` for light and dark;
- may run scripts, if it is the same on every load.

### The config

`parallax.config.ts`, at the repository root, lists the extensions with their options, in the order they are shown:

```ts
export default { extensions: [code(), openapi({ path: "api.yaml" })] }
```

Options are typed; the core never sees them. The config and extensions are TypeScript or `.tsx`, run without a build.
`import … from "parallax"` resolves to the parallax that runs them. They load from the working checkout, so both
snapshots of a change are made by the same extension code.

## Drawing a change

```
parallax [--base <ref>] [--head <commit>] [--open]
```

- `--head` defaults to the checked-out commit.
- The base is where the head's branch left `--base` (default: the main branch), so the change is what the branch did.
- Each commit is read in its own checkout. Uncommitted work is ignored, with a warning.
- A wrong argument fails before anything runs, with the usage.

Extensions run in config order, one line of output per step. The output goes to `.parallax/<base>-<head>/`, emptied
first:

- a page per view, named after its extension: `api.html`, or `api-1.html`, `api-2.html` for several;
- `canvas.html`;
- `change.json`, the **change set**: the two commits and each extension's delta and views.

When no extension finds a change, nothing is written and the run says so. `--open` opens the canvas in the browser.
Parallax runs without a build, through `npx --yes github:DavidOpDeBeeck/parallax#<ref>` or installed in a project.

### The canvas

A single self-contained file:

- a bar with parallax's wordmark, the repository and the two commits;
- an area per extension, side by side in config order, with its views stacked under their titles, or its name and "no
  change";
- each view in a frame 880 pixels wide and as tall as its page, in the viewer's light or dark.

It opens with the whole board in view, at most at real size. Drag pans, scroll or pinch zooms at the pointer, `f`
fits, `0` resets to real size, `+` and `-` zoom. Clicking a view hands it clicks and scrolling; `Esc` takes them back.

## Commenting on a pull request

The GitHub action, set up as in [the README](../README.md#get-started):

- runs parallax from its own checkout, so `import … from "parallax"` gets the version the workflow names;
- draws the change and takes a **picture** of each view in Chromium, 880 pixels wide, light and dark, the whole page
  once loaded (`api-light.png`, `api-dark.png`);
- uploads pages, canvas, pictures and change set as the run's artifact;
- keeps **one** comment, updated on every push, with each view's title and picture in the reader's light or dark, the
  extensions with no change, and how to open the canvas locally (`git fetch origin pull/<number>/head`, then
  `npx --yes github:<repository>#<ref> --base <base> --head <head> --open`); with no change and no comment yet, it adds
  none;
- attaches pictures the way a file dragged into a comment is, so only readers of the repository see them; this is
  undocumented, needs a person's or bot account's token that can push to the repository (the workflow's own token
  can't), and without `attach-token` the comment step fails and says so;
- draws a pull request from a fork and keeps the artifact, but doesn't comment: its workflow can't write and gets no
  secrets.

The workflow runs one parallax per pull request at a time, so the last push writes the comment. Anything the views and
extensions need, such as the project's packages or a browser, the workflow installs before the action.
