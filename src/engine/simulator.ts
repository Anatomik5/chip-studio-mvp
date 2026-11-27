import type { CircuitNode, ClockCycleState, Netlist, Port, SignalValue } from '../types/netlist'
import { maskFor, portKey, validateWire } from '../types/netlist'

/** Cycle evaluator. Rendering receives snapshots and never accesses this state. */
export class CircuitSimulator {
  cycle = 0
  private signals: Record<string, SignalValue> = {}
  private registers: Record<string, SignalValue> = {}
  constructor(public netlist: Netlist) { this.evaluate() }
  setInput(nodeId: string, portId: string, value: number) { const p = this.port(nodeId, portId); if (p) { this.signals[portKey(nodeId, portId)] = value & maskFor(p.width); this.evaluate() } }
  step(): ClockCycleState { this.cycle++; for (const node of this.netlist.nodes) if (node.kind === 'register') { const d = node.ports.find(p => p.id === 'd'); if (d) this.registers[node.id] = this.signals[portKey(node.id, d.id)] ?? this.registers[node.id] ?? 0 } this.evaluate(); return this.state() }
  state(): ClockCycleState { return { cycle: this.cycle, signals: { ...this.signals }, registers: { ...this.registers } } }
  private port(n: string, p: string) { return this.netlist.nodes.find(x => x.id === n)?.ports.find(x => x.id === p) }
  private evaluate() { for (let pass = 0; pass < 4; pass++) { for (const node of this.netlist.nodes) { const input = (id: string) => this.signals[portKey(node.id, id)] ?? 0; const output = (id: string, value: number) => { const port = node.ports.find(p => p.id === id); if (port) this.signals[portKey(node.id, id)] = value & maskFor(port.width) }
    if (node.kind === 'register') output('q', this.registers[node.id] ?? 0)
    if (node.kind === 'alu') { const op = String(node.data?.operation ?? (input('op') ? 'XOR' : 'ADD')); const value = op === 'XOR' ? input('a') ^ input('b') : input('a') + input('b'); output('out', value); output('zero', value === 0 ? 1 : 0) }
    if (node.kind === 'gate') { const op = String(node.data?.operation ?? 'AND'); const a = input('a'), b = input('b'); output('out', op === 'OR' ? a | b : op === 'XOR' ? a ^ b : op === 'EQUAL_ZERO' ? (a === 0 ? 1 : 0) : a & b) }
    if (node.kind === 'mux') output('out', input('sel') ? input('b') : input('a'))
  } for (const wire of this.netlist.wires) this.signals[portKey(wire.target, wire.targetPort)] = this.signals[portKey(wire.source, wire.sourcePort)] ?? 0 } }
}

type Signal = { name: string; width: number; direction: 'input' | 'output' | 'register' }
const clean = (source: string) => source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const widthOf = (range?: string) => { const bits = range?.match(/\[(\d+)\s*:\s*(\d+)\]/); return bits ? Math.abs(Number(bits[1]) - Number(bits[2])) + 1 : 1 }
const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_')

/** Parses the common synthesizable subset used by the included ALU and CPU examples. */
export function parseVerilogToNetlist(source: string): Netlist {
  const text = clean(source), moduleMatch = text.match(/\bmodule\s+([A-Za-z_]\w*)/)
  if (!moduleMatch) throw new Error('Expected a Verilog module declaration.')
  const signals = new Map<string, Signal>()
  const declared = /\b(input|output)\s+(?:reg\s+|wire\s+)?(\[[^\]]+\]\s*)?([A-Za-z_]\w*)/g
  for (let match; (match = declared.exec(text));) signals.set(match[3], { name: match[3], width: widthOf(match[2]), direction: match[1] as 'input' | 'output' })
  const registers = /\breg\s+(\[[^\]]+\]\s*)?([A-Za-z_]\w*)/g
  for (let match; (match = registers.exec(text));) if (!signals.has(match[2])) signals.set(match[2], { name: match[2], width: widthOf(match[1]), direction: 'register' })
  if (!signals.size) throw new Error('No ANSI-style input or output declarations were found.')
  const nodes: CircuitNode[] = [], endpoints = new Map<string, { node: string; port: string; width: number }>()
  const addNode = (node: CircuitNode) => nodes.push(node)
  let inputY = 70, outputY = 70, registerY = 350
  for (const signal of signals.values()) {
    if (signal.direction === 'input') { addNode({ id: safeId(signal.name), label: signal.name, kind: 'input', x: 30, y: inputY, ports: [{ id: 'out', label: signal.name, direction: 'output', width: signal.width }] }); endpoints.set(signal.name, { node: safeId(signal.name), port: 'out', width: signal.width }); inputY += 100 }
    if (signal.direction === 'output') { addNode({ id: safeId(signal.name), label: signal.name, kind: 'output', x: 760, y: outputY, ports: [{ id: 'in', label: signal.name, direction: 'input', width: signal.width }] }); outputY += 100 }
    if (signal.direction === 'register') { const id = `reg_${safeId(signal.name)}`; addNode({ id, label: signal.name, kind: 'register', x: 420, y: registerY, ports: [{ id: 'd', label: 'D', direction: 'input', width: signal.width }, { id: 'q', label: 'Q', direction: 'output', width: signal.width }] }); endpoints.set(signal.name, { node: id, port: 'q', width: signal.width }); registerY += 100 }
  }
  const netlist: Netlist = { name: moduleMatch[1], nodes, wires: [] }
  const wire = (from: string, toNode: string, toPort: string) => { const fromEnd = endpoints.get(from), target = netlist.nodes.find(n => n.id === toNode)?.ports.find(p => p.id === toPort); if (!fromEnd || !target) return; const checked = validateWire(netlist, { source: fromEnd.node, sourcePort: fromEnd.port, target: toNode, targetPort: toPort }); if (checked.ok) netlist.wires.push({ id: `${fromEnd.node}-${toNode}-${toPort}`, source: fromEnd.node, sourcePort: fromEnd.port, target: toNode, targetPort: toPort, width: checked.width! }) }
  const statements = [...text.matchAll(/(?:assign\s+)?([A-Za-z_]\w*)\s*(?:<=|=)\s*([^;]+);/g)]
  let operationY = 180
  for (const statement of statements) {
    const target = statement[1], expression = statement[2].trim(), destination = signals.get(target)
    const operands = [...expression.matchAll(/\b([A-Za-z_]\w*)\b/g)].map(m => m[1]).filter(name => endpoints.has(name) && name !== target)
    const width = destination?.width ?? endpoints.get(target)?.width ?? (operands[0] ? endpoints.get(operands[0])!.width : 1)
    const inputWidth = operands[0] ? endpoints.get(operands[0])!.width : width
    const targetNode = destination?.direction === 'output' ? safeId(target) : signals.get(target)?.direction === 'register' ? `reg_${safeId(target)}` : undefined
    if (operands.length === 1 && targetNode) { wire(operands[0], targetNode, destination?.direction === 'output' ? 'in' : 'd'); continue }
    if (operands.length >= 1) {
      const op = expression.includes('^') ? 'XOR' : expression.includes('+') ? 'ADD' : expression.includes('|') ? 'OR' : expression.includes('==') ? 'EQUAL_ZERO' : 'AND'
      const isAlu = op === 'ADD' || op === 'XOR', id = `op_${safeId(target)}_${operationY}`
      const ports: Port[] = isAlu ? [{ id: 'a', label: 'A', direction: 'input', width: inputWidth }, { id: 'b', label: 'B', direction: 'input', width: inputWidth }, { id: 'out', label: 'OUT', direction: 'output', width }, { id: 'zero', label: 'ZERO', direction: 'output', width: 1 }] : [{ id: 'a', label: 'A', direction: 'input', width: inputWidth }, { id: 'b', label: 'B', direction: 'input', width: inputWidth }, { id: 'out', label: 'OUT', direction: 'output', width: destination?.width ?? width }]
      addNode({ id, label: `${target} ${op}`, kind: isAlu ? 'alu' : 'gate', x: 380, y: operationY, ports, data: { operation: op } }); endpoints.set(target, { node: id, port: 'out', width: destination?.width ?? width }); wire(operands[0], id, 'a'); if (operands[1]) wire(operands[1], id, 'b'); if (targetNode) wire(target, targetNode, destination?.direction === 'output' ? 'in' : 'd'); operationY += 130
    }
  }
  for (const signal of signals.values()) if (signal.direction === 'output' && endpoints.has(signal.name)) wire(signal.name, safeId(signal.name), 'in')
  return netlist
}

export async function parseVerilogFile(file: File): Promise<Netlist> { return parseVerilogToNetlist(await file.text()) }

export function createDemoNetlist(): Netlist { return { name: '4-bit ALU', nodes: [
  { id: 'a', label: 'A input', kind: 'input', x: 40, y: 100, ports: [{ id: 'out', label: 'A', direction: 'output', width: 4 }] }, { id: 'b', label: 'B input', kind: 'input', x: 40, y: 250, ports: [{ id: 'out', label: 'B', direction: 'output', width: 4 }] }, { id: 'op', label: 'Mode', kind: 'input', x: 40, y: 400, ports: [{ id: 'out', label: 'ADD / XOR', direction: 'output', width: 1 }] },
  { id: 'alu', label: 'ALU', kind: 'alu', x: 360, y: 180, ports: [{ id: 'a', label: 'A', direction: 'input', width: 4 }, { id: 'b', label: 'B', direction: 'input', width: 4 }, { id: 'op', label: 'OP', direction: 'input', width: 1 }, { id: 'out', label: 'Result', direction: 'output', width: 4 }, { id: 'zero', label: 'Zero', direction: 'output', width: 1 }] },
  { id: 'result', label: 'Result', kind: 'output', x: 680, y: 200, ports: [{ id: 'in', label: 'Value', direction: 'input', width: 4 }] }, { id: 'zero', label: 'Zero flag', kind: 'output', x: 680, y: 350, ports: [{ id: 'in', label: 'Z', direction: 'input', width: 1 }] }
], wires: [{ id: 'a-alu', source: 'a', sourcePort: 'out', target: 'alu', targetPort: 'a', width: 4 }, { id: 'b-alu', source: 'b', sourcePort: 'out', target: 'alu', targetPort: 'b', width: 4 }, { id: 'op-alu', source: 'op', sourcePort: 'out', target: 'alu', targetPort: 'op', width: 1 }, { id: 'alu-result', source: 'alu', sourcePort: 'out', target: 'result', targetPort: 'in', width: 4 }, { id: 'alu-zero', source: 'alu', sourcePort: 'zero', target: 'zero', targetPort: 'in', width: 1 }] } }
