import type { ClockCycleState, Netlist, SignalValue } from '../types/netlist'
import { maskFor, portKey } from '../types/netlist'

/** Deliberately small evaluator: UI never imports this mutable simulation state directly. */
export class CircuitSimulator {
  cycle = 0
  private signals: Record<string, SignalValue> = {}
  private registers: Record<string, SignalValue> = {}
  constructor(public netlist: Netlist) { this.evaluate() }
  setInput(nodeId: string, portId: string, value: number) { const p = this.port(nodeId, portId); if (p) { this.signals[portKey(nodeId, portId)] = value & maskFor(p.width); this.evaluate() } }
  step(): ClockCycleState { this.cycle++; for (const node of this.netlist.nodes) if (node.kind === 'register') { const input = node.ports.find(p => p.direction === 'input'); const output = node.ports.find(p => p.direction === 'output'); if (input && output) this.registers[node.id] = this.signals[portKey(node.id, input.id)] ?? this.registers[node.id] ?? 0 } this.evaluate(); return this.state() }
  state(): ClockCycleState { return { cycle: this.cycle, signals: { ...this.signals }, registers: { ...this.registers } } }
  private port(n: string, p: string) { return this.netlist.nodes.find(x => x.id === n)?.ports.find(x => x.id === p) }
  private evaluate() {
    for (let pass = 0; pass < 3; pass++) {
      for (const node of this.netlist.nodes) {
        const inValue = (id: string) => this.signals[portKey(node.id, id)] ?? 0
        const out = (id: string, v: number) => { const p = node.ports.find(x => x.id === id); if (p) this.signals[portKey(node.id, id)] = v & maskFor(p.width) }
        if (node.kind === 'register') out('q', this.registers[node.id] ?? 0)
        if (node.kind === 'alu') { const a = inValue('a'), b = inValue('b'), op = inValue('op'); const v = op ? a ^ b : a + b; out('out', v); out('zero', v === 0 ? 1 : 0) }
        if (node.kind === 'gate') { const a = inValue('a'), b = inValue('b'); out('out', (node.data?.operation === 'AND' ? a & b : a ^ b)) }
        if (node.kind === 'mux') out('out', inValue('sel') ? inValue('b') : inValue('a'))
      }
      for (const wire of this.netlist.wires) this.signals[portKey(wire.target, wire.targetPort)] = this.signals[portKey(wire.source, wire.sourcePort)] ?? 0
    }
  }
}

/** Placeholder parser boundary: replace with a WASM parser without touching UI or simulation. */
export function parseVerilogToNetlist(source: string): Netlist { if (!source.includes('module')) throw new Error('Expected a Verilog module declaration.'); return createDemoNetlist() }

export function createDemoNetlist(): Netlist {
  return { name: '4-bit ALU', nodes: [
    { id: 'a', label: 'A input', kind: 'input', x: 40, y: 100, ports: [{ id: 'out', label: 'A', direction: 'output', width: 4 }] },
    { id: 'b', label: 'B input', kind: 'input', x: 40, y: 250, ports: [{ id: 'out', label: 'B', direction: 'output', width: 4 }] },
    { id: 'op', label: 'Mode', kind: 'input', x: 40, y: 400, ports: [{ id: 'out', label: 'ADD / XOR', direction: 'output', width: 1 }] },
    { id: 'alu', label: 'ALU', kind: 'alu', x: 360, y: 180, ports: [{ id: 'a', label: 'A', direction: 'input', width: 4 }, { id: 'b', label: 'B', direction: 'input', width: 4 }, { id: 'op', label: 'OP', direction: 'input', width: 1 }, { id: 'out', label: 'Result', direction: 'output', width: 4 }, { id: 'zero', label: 'Zero', direction: 'output', width: 1 }] },
    { id: 'result', label: 'Result', kind: 'output', x: 680, y: 200, ports: [{ id: 'in', label: 'Value', direction: 'input', width: 4 }] },
    { id: 'zero', label: 'Zero flag', kind: 'output', x: 680, y: 350, ports: [{ id: 'in', label: 'Z', direction: 'input', width: 1 }] }
  ], wires: [
    { id: 'a-alu', source: 'a', sourcePort: 'out', target: 'alu', targetPort: 'a', width: 4 }, { id: 'b-alu', source: 'b', sourcePort: 'out', target: 'alu', targetPort: 'b', width: 4 }, { id: 'op-alu', source: 'op', sourcePort: 'out', target: 'alu', targetPort: 'op', width: 1 }, { id: 'alu-result', source: 'alu', sourcePort: 'out', target: 'result', targetPort: 'in', width: 4 }, { id: 'alu-zero', source: 'alu', sourcePort: 'zero', target: 'zero', targetPort: 'in', width: 1 }
  ] }
}
