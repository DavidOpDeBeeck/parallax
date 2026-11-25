# parallax

What parallax should do is in [the specification](docs/spec.md); build only what it asks for, in small steps. The code is
TypeScript that Node runs as it is, with no build step: `pnpm parallax` draws the checked-out change, `pnpm test` runs
the tests in a random order, `pnpm typecheck` checks the types, `pnpm lint` checks layout and lint with Biome, and
`pnpm format` fixes what it can.

Write code a reader can trust just by reading it: behaviour is explicit, values are valid, failures are loud and
specific, and nothing exists without a reason.

## Priorities

When goals conflict, the higher one wins:

1. **What callers see is right**: results, side effects, failures and their order.
2. **A small surface**: fewer exports, types, options and extension points. Leave out what no caller needs yet.
3. **A core that knows nothing of its extensions** or of where it runs; what is particular to git, GitHub or a
   browser stays at the boundary that needs it.
4. **Early failure with a useful error**: a wrong setup fails before anything runs, never falls back to something
   nobody chose.
5. **Direct code** a reader follows top to bottom.
6. **Deduplication**, last: code that looks alike is shared only when it follows the same rule.

## How to work

- Before writing, settle where the change belongs, the smallest contract that does the job, and which test proves it.
  Then build one complete behaviour at a time, with its tests.
- The formatter and the linter decide layout; nothing else does. Don't reformat unrelated code.
- Say a thing in one place: the why of a design goes in the specification, not in a comment beside each place it
  shows.
- Work in small commits, each one concern and each green on its own.
- A change that only restructures code keeps behaviour the same: the tests pass before and after, and any output stays
  the same byte for byte.
- A name that no longer fits its concept is renamed: that is an improvement, not churn.

## How the code reads

### Names

- Names are the domain's words, written out. A function is a verb; a value says what it holds. No vague names
  (`manager`, `util`, `helper`, `data`, `info`).
- No one-letter or abbreviated names for values. Coordinates and sizes in drawing code, and a loop's index, are the
  exception.
- Values and functions in camelCase, types in PascalCase, files in kebab-case. No prefixes on types (`IThing`,
  `TThing`).

### Files and modules

- A file holds one behaviour, with the types and helpers only it uses. A type, a step or a few lines don't get a file
  of their own.
- Split a file when it holds two behaviours that change apart, or grows past about 200 lines. Callers import from the
  file they need: no `index.ts` that only re-exports, and no file of unrelated helpers.
- Named exports. A default export only where something loads a module by its default: an extension, the config.

### Data and types

- Data is plain objects and arrays, described by a `type`. Build it with an object literal checked against its type;
  no builders, setters or classes for data.
- A choice between kinds is a union with a field that tells them apart, handled with a `switch` the compiler checks
  is complete, not a class hierarchy. A function with several outcomes returns such a union, not a boolean beside an
  optional error.
- Don't change what a function was given; return a new value. Changing a local while building a result is fine. Don't
  copy what you were given in case the caller changes it.
- No `any`. Data from outside the types is `unknown` until it is checked. `as` and `!` only where the compiler can't
  follow and the reason is plain.

### Functions and state

- Plain functions first. A class only for something that holds state over time or a resource to release (a running
  process, a cache), given what it needs in its constructor.
- Nothing mutable lives at module level.
- A closure stays small and local; one that keeps growing state of its own becomes a function of its own, or a class
  if it really holds state.
- `async` and `await`, never a promise left unawaited. The order of side effects, and what a failure leaves behind,
  are behaviour: don't change them without a test that shows it.
- A function reads top to bottom: work out the values, check the guards, do the work, translate a failure, return. A
  blank line separates the steps.
- Extract a function to name a step or keep a boundary apart, not to make a function shorter.
- Expressions to transform and search (`map`, `filter`, `find`); loops for control: side effects, resources, early
  exits.

### Checks and failures

- Check a value once, where it comes in from outside the types (a file read from disk, the command line, a request
  body), then trust the types. Ordinary functions don't check again, and what TypeScript already holds (an extension's
  delta, a typed config) isn't checked at all.
- Parse, don't validate: a check takes `unknown` and returns the typed value, so nothing after it has to check again.
- Check what protects behaviour (input that can't be read, a missing setting, an ambiguous name), not format (a name
  that is not blank, a length).
- A check's error says what is wrong, what was expected and what was found.
- Wrap a failure only at a boundary (a process, git, an HTTP API, a file): say what was being done, and keep the
  original error as its `cause`. Never swallow a failure.

### Options

- A function with options takes one options object of a named type, not a row of positional flags.
- A default is written once, where it is decided: in the destructuring of the options.

### Comments

- No doc comments, the public API included: names and types say what the code does.
- Comment only a reason the code can't show: a workaround for a tool, a warning, a fact from outside (an undocumented
  API). A line or two. A better name or type beats a comment.

### Consistency

- The same thing has the same shape everywhere: one way to do each recurring job (run a process, make a temporary
  folder, word a count, draw a status), shared, not written again.
- When the same concern is written several ways, make it one shared helper and use it everywhere. Parallel paths that
  stay apart keep the same names and order of steps, so a difference between them is visible and meant.
- One declaration per `const`. No nested ternaries: use a function or an `if`.

### Tests

- A test checks what a caller sees: results, side effects, the failure and its message, and what must not happen.
  Not private calls, and not what has no behaviour.
- Real objects and small handwritten fakes, not mocks. A temporary git repository is real enough.
- A test's name reads as a sentence of behaviour.
- Arrange, act and assert are separated by blank lines.
- Each test has one action; each failure case its own test.
- No test depends on another having run first; they pass in any order. Nothing waits for a fixed time.
- A test's own fixtures stay beside it; only fixtures several tests share get a file of their own.

## Before finishing

- Is every new export, type and option needed by a caller today?
- Is each value checked once, where it comes in, and does each check protect behaviour?
- Does every error a user can cause say what is wrong, what was expected and what was found?
- Do parallel paths still mirror each other?
- Does every file hold one behaviour, and every comment a reason the code can't show?
- Do the tests check what callers see, without mocks or waiting?
