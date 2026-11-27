/** Shared, renderer-independent circuit model. Values are always unsigned integers. */
export type PortDirection = 'input' | 'output'
export type SignalValue = number

export interface Port { id: string; label: string; direction: PortDirection; width: number; value?: SignalValue }
export interface CircuitNode {
  id: string; label: string; kind: 'input' | 'output' | 'register' | 'alu' | 'gate' | 'mux' | 'clock';
  x: number; y: number; ports: Port[]; data?: Record<string, unknown>
}
export interface Wire { id: string; source: string; sourcePort: string; target: string; targetPort: string; width: number; value?: SignalValue }
export interface Netlist { name: string; nodes: CircuitNode[]; wires: Wire[] }
export interface ClockCycleState { cycle: number; signals: Record<string, SignalValue>; registers: Record<string, SignalValue> }

export const portKey = (nodeId: string, portId: string) => `${nodeId}.${portId}`
export const maskFor = (width: number) => width >= 32 ? 0xffffffff : (1 << width) - 1
export const formatSignal = (value: number, width: number) => width === 1 ? String(value & 1) : `0x${(value & maskFor(width)).toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')}`

export function validateWire(netlist: Netlist, wire: Omit<Wire, 'id' | 'width'>): { ok: boolean; error?: string; width?: number } {
  const source = netlist.nodes.find(n => n.id === wire.source)?.ports.find(p => p.id === wire.sourcePort)
  const target = netlist.nodes.find(n => n.id === wire.target)?.ports.find(p => p.id === wire.targetPort)
  if (!source || !target) return { ok: false, error: 'Both connection ports must exist.' }
  if (source.direction !== 'output' || target.direction !== 'input') return { ok: false, error: 'Connect an output port to an input port.' }
  if (source.width !== target.width) return { ok: false, error: `Bit-width mismatch: ${source.width}-bit to ${target.width}-bit.` }
  return { ok: true, width: source.width }
}
