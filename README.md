# Chip Studio

An interactive CPU/chip visualizer with a live 4-bit ALU, editable signal graph, clocked simulator, and local AI tutor.

## Run it

```bash
npm install
npm run dev
```

Then open the local address shown in the terminal. No API key is required: the built-in tutor is ready immediately.

## Try the MVP

1. Click an input value on the canvas, then use **Step clock** or **Play** to see live wire colors and the rolling waveform panel.
2. Open `examples/simple_alu.v` or `examples/mini_cpu.v` with **Open .v file**, or use **Paste Verilog**. The parser extracts ANSI-style ports, bit widths, registers, and common combinational expressions into the typed netlist.
3. Ask the tutor about the ALU, inspect a component, add a module, or advance clock cycles. Provider settings optionally support OpenAI-compatible or Anthropic endpoints; keys remain in the current browser session.
4. Select one of the three **Fix the Broken CPU** challenges, reconnect the missing compatible wire, then choose **Check repair**.

## Development

```bash
npm install
npm run build
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
