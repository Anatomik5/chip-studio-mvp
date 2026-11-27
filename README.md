# Chip Studio

An interactive CPU/chip visualizer with a live 4-bit ALU, editable signal graph, clocked simulator, and local AI tutor.

## Run it

```bash
npm install
npm run dev
```

For a production check, run `npm run build`.

## MVP capabilities

- Drag blocks and connect compatible output/input ports. Connections with incompatible bit widths are rejected.
- Toggle input values and watch animated green logic-high wires and hexadecimal buses.
- Play, pause, and step the cycle evaluator.
- Ask the local tutor about the ALU/Zero flag, add an AND/XOR gate, register, or multiplexer, or request clock steps. Its dispatcher is separated so an OpenAI or Anthropic adapter can be added without changing the canvas.
- `examples/` includes an ALU and a small accumulator CPU Verilog reference.

## Two-person workflow

Use short-lived branches such as `feat/simulator` and `feat/canvas`. Split work across `src/engine` + `src/types` versus `src/ui` + `src/agent`; coordinate any change to `src/types/netlist.ts` first. Rebase before merging and require `npm run build` on every branch.
