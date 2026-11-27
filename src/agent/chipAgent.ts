import type { Netlist } from '../types/netlist'
import { validateWire } from '../types/netlist'

export type AgentTool = 'inspect_component' | 'connect_wire' | 'disconnect_wire' | 'add_module' | 'step_clock'
export type AgentResult = { message: string; highlight?: string; steps?: number; netlist?: Netlist }

export function dispatchTutor(text: string, netlist: Netlist): AgentResult {
  const lower = text.toLowerCase()
  if (/step\s+(\d+)/.test(lower)) return { message: `Advancing ${Number(lower.match(/step\s+(\d+)/)?.[1])} clock cycles.`, steps: Number(lower.match(/step\s+(\d+)/)?.[1]) }
  if (/step|clock cycle/.test(lower)) return { message: 'Advancing one clock cycle.', steps: 1 }
  if (/zero/.test(lower)) return { message: 'The Zero flag is 1 when the ALU result is exactly 0. In this model it is recalculated whenever an input or operation changes.', highlight: 'alu' }
  if (/how.*alu|alu.*work/.test(lower)) return { message: 'This 4-bit ALU receives A and B. With Mode = 0 it adds them; with Mode = 1 it XORs them. Its Result and Zero ports update live.', highlight: 'alu' }
  if (/add.*(and|xor|register|mux|multiplexer)/.test(lower)) {
    const id = `module-${Date.now()}`
    const node = /register/.test(lower)
      ? { id, label: '4-bit register', kind: 'register' as const, x: 370, y: 480, ports: [{ id: 'd', label: 'D', direction: 'input' as const, width: 4 }, { id: 'q', label: 'Q', direction: 'output' as const, width: 4 }] }
      : /mux|multiplexer/.test(lower)
        ? { id, label: '4-bit MUX', kind: 'mux' as const, x: 370, y: 480, ports: [{ id: 'a', label: 'A', direction: 'input' as const, width: 4 }, { id: 'b', label: 'B', direction: 'input' as const, width: 4 }, { id: 'sel', label: 'SEL', direction: 'input' as const, width: 1 }, { id: 'out', label: 'OUT', direction: 'output' as const, width: 4 }] }
        : { id, label: /xor/.test(lower) ? 'XOR gate' : 'AND gate', kind: 'gate' as const, x: 370, y: 480, data: { operation: /xor/.test(lower) ? 'XOR' : 'AND' }, ports: [{ id: 'a', label: 'A', direction: 'input' as const, width: 1 }, { id: 'b', label: 'B', direction: 'input' as const, width: 1 }, { id: 'out', label: 'OUT', direction: 'output' as const, width: 1 }] }
    return { message: `Added ${node.label}. Drag from its output handle to a compatible input to wire it.`, highlight: node.id, netlist: { ...netlist, nodes: [...netlist.nodes, node] } }
  }
  if (/connect/.test(lower)) return { message: 'To connect parts, drag from an output handle to an input handle. Connections are accepted only when their bit-widths match.' }
  if (/inspect/.test(lower)) { const node = netlist.nodes.find(n => lower.includes(n.label.toLowerCase())) ?? netlist.nodes.find(n => n.kind === 'alu'); return { message: `Inspecting ${node?.label ?? 'the circuit'}.`, highlight: node?.id } }
  return { message: 'Try “How does this ALU work?”, “Why is the Zero flag active?”, “Add an AND gate”, or “Step 3 clock cycles”.' }
}

export function connectWire(netlist: Netlist, source: string, sourcePort: string, target: string, targetPort: string): AgentResult {
  const check = validateWire(netlist, { source, sourcePort, target, targetPort })
  if (!check.ok) return { message: check.error! }
  return { message: 'Wire connected.', netlist: { ...netlist, wires: [...netlist.wires, { id: `${source}-${sourcePort}-${target}-${targetPort}`, source, sourcePort, target, targetPort, width: check.width! }] } }
}
