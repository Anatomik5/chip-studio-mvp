# Chip Studio contributor guide

## Architecture boundary
- `src/engine/` owns parsing, simulation, netlist transformations, and bit-width validation. It must not import React or browser rendering APIs.
- `src/ui/` renders supplied netlist/simulation snapshots; it must not implement logic evaluation.
- `src/agent/` turns tutoring requests into typed engine operations; do not let a model create unvalidated wires.
- `src/types/netlist.ts` is the shared contract. Extend it before adding cross-layer data.

## Circuit safety
Always call `validateWire` before adding a wire. Only output → input connections with identical bit widths are allowed. Mask computed values to their port width. Keep clock transitions explicit.

## Collaboration
Keep PRs narrow: one developer can own `engine/types`, while the other owns `ui/agent`. Avoid editing the same component and schema files in one branch. Rebase before hand-off, run `npm run build`, and describe schema changes in the PR.

## GitHub Workflow
Always branch from current `main` using `feat/issue-<number>-<slug>`. Reference the issue number in commits (for example, `feat(engine): add parser adapter (#1)`) and open a pull request with `gh pr create`. Before requesting review, verify layer isolation, bit-width validation for any new wires, and `npm run build`.
