# Chip Studio

**Chip Studio** is an interactive CPU and chip visualizer that makes digital hardware approachable. Instead of starting with a wall of Verilog or a textbook diagram, you can click inputs, watch signals travel through a circuit, step a clock, and ask a built-in tutor what is happening.

It is designed for curious beginners, students, and teams prototyping a small digital design.

## Instant live demo

Open the public demo at [anatomik5.github.io/chip-studio-mvp](https://anatomik5.github.io/chip-studio-mvp/). It is deployed automatically with GitHub Pages whenever `main` changes.

## One-click offline run — zero install

Download [`release/chip-studio-mvp.html`](release/chip-studio-mvp.html), then double-click the file (or drag it into Chrome, Edge, Safari, or Firefox). Everything is bundled into that one HTML file—no Node.js, npm, account, API key, or local server is required.

## What you can explore

- **Live circuits:** drag blocks, connect compatible ports, delete wires, and see active signals glow.
- **Clocked simulation:** toggle inputs, use Step Clock or Play, and inspect recent waveform history.
- **Built-in designs:** switch between a 4-bit **Simple ALU** and an 8-bit **Mini CPU**.
- **Verilog import:** open or paste `.v` source. Chip Studio extracts ports, widths, registers, and common combinational expressions into an editable netlist.
- **AI Tutor:** ask how a component works, inspect it, add modules, or advance cycles. The default tutor is fully local and offline.
- **Fix the Broken CPU:** complete three guided repair challenges by reconnecting the missing paths.

## Start here

1. Click an input value on the canvas and press **Step clock**.
2. Choose **Mini CPU**, or load [`examples/simple_alu.v`](examples/simple_alu.v) / [`examples/mini_cpu.v`](examples/mini_cpu.v).
3. Ask the Tutor “How does this ALU work?” or start a repair challenge in the sidebar.

## AI and privacy

Chip Studio starts in **Local offline mode** and needs no API key. You may optionally select an OpenAI-compatible or Anthropic provider in the Tutor settings. Any key you enter remains only in the current browser session; it is never saved and is never sent to a Chip Studio backend. Use **Clear Key & use local mode** to remove it immediately.

## Developer local setup

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build             # normal Vite production build
npm run build:standalone  # produces a self-contained HTML build
```

## Project structure

- `src/engine/` — parsing and cycle simulation
- `src/ui/` — the React Flow canvas, waveforms, and onboarding
- `src/agent/` — local tutor, optional provider adapters, and guarded tool calls
- `src/types/` — shared typed netlist contract
- `examples/` — small Verilog designs to load and explore

Contributions should follow the architecture and wire-width rules in [AGENTS.md](AGENTS.md).
