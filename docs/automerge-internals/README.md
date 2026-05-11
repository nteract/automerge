# Automerge Internals Explorer

A local MDX learning site for the `nteract/automerge` `desktop-patches` branch.
It is intentionally separate from the upstream public docs: the pages mix
stable Automerge mental models with provisional notes from the desktop panic
debugging patch stack.

## Run locally

```bash
cd docs/automerge-internals
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Build check

```bash
cd docs/automerge-internals
npm run typecheck
npm run build
```

## Content model

- `content/*.mdx` are the lesson pages.
- `content/registry.ts` defines ordering, labels, and related source paths.
- `components/Quiz.tsx` powers the interactive knowledge checks.
- Source paths are relative to the repository root so notes stay portable.

The bug-lab pages should continue to label fork patches as provisional until the
reductions are accepted upstream or replaced with stronger evidence.
