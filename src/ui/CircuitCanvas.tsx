import { Background, Controls, Handle, Position, ReactFlow, type Connection, type Edge, type Node, type NodeProps, useEdgesState, useNodesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo } from 'react'
import type { ClockCycleState, Netlist } from '../types/netlist'
import { formatSignal, portKey, validateWire } from '../types/netlist'

type CanvasData = { circuit: import('../types/netlist').CircuitNode; state: ClockCycleState; selected?: boolean; onInput: (node: string, port: string, value: number) => void }
function ChipNode({ data }: NodeProps<Node<CanvasData>>) {
  const { circuit, state, onInput, selected } = data
  return <div className={`min-w-36 rounded-xl border p-3 shadow-xl ${selected ? 'border-cyan-300 ring-2 ring-cyan-300/40' : 'border-slate-600'} bg-slate-900/95`}>
    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-200">{circuit.kind}</div><div className="mb-3 font-semibold">{circuit.label}</div>
    {circuit.ports.map(port => { const value = state.signals[portKey(circuit.id, port.id)] ?? 0; const on = value !== 0; const position = port.direction === 'input' ? Position.Left : Position.Right; return <div key={port.id} className={`relative my-1 flex items-center ${port.direction === 'output' ? 'justify-end' : 'justify-start'} text-xs ${on ? 'text-emerald-300' : 'text-slate-400'}`}>
      <Handle type={port.direction === 'input' ? 'target' : 'source'} position={position} id={port.id} className={on ? 'signal-on !bg-emerald-400' : ''} />
      {port.direction === 'input' && circuit.kind === 'input' ? <button onClick={() => onInput(circuit.id, port.id, port.width === 1 ? (value ? 0 : 1) : (value + 1) % (1 << port.width))} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">{port.label}: {formatSignal(value, port.width)}</button> : <span>{port.label}: <b>{formatSignal(value, port.width)}</b></span>}
    </div> })}
  </div>
}
const nodeTypes = { chip: ChipNode }

export default function CircuitCanvas({ netlist, state, highlighted, onNetlist, onInput }: { netlist: Netlist; state: ClockCycleState; highlighted?: string; onNetlist: (n: Netlist) => void; onInput: (n: string, p: string, v: number) => void }) {
  const initialNodes = useMemo(() => netlist.nodes.map(c => ({ id: c.id, type: 'chip', position: { x: c.x, y: c.y }, data: { circuit: c, state, selected: c.id === highlighted, onInput } })), [netlist.nodes, state, highlighted, onInput])
  const initialEdges = useMemo(() => netlist.wires.map(w => edgeFor(w, state)), [netlist.wires, state])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]); useEffect(() => setEdges(initialEdges), [initialEdges, setEdges])
  const connect = (c: Connection) => { if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return; const check = validateWire(netlist, { source: c.source, sourcePort: c.sourceHandle, target: c.target, targetPort: c.targetHandle }); if (!check.ok) { window.alert(check.error); return }; onNetlist({ ...netlist, wires: [...netlist.wires, { id: `wire-${Date.now()}`, source: c.source, sourcePort: c.sourceHandle, target: c.target, targetPort: c.targetHandle, width: check.width! }] }) }
  const remove = (deleted: Edge[]) => onNetlist({ ...netlist, wires: netlist.wires.filter(w => !deleted.some(e => e.id === w.id)) })
  return <div className="h-full w-full"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onEdgesDelete={remove} nodeTypes={nodeTypes} fitView deleteKeyCode="Delete" className="bg-[#081321]"><Background color="#1e3a5f" gap={24} /><Controls /></ReactFlow></div>
}
function edgeFor(wire: import('../types/netlist').Wire, state: ClockCycleState): Edge { const on = (state.signals[portKey(wire.source, wire.sourcePort)] ?? 0) !== 0; return { id: wire.id, source: wire.source, sourceHandle: wire.sourcePort, target: wire.target, targetHandle: wire.targetPort, animated: on, label: formatSignal(state.signals[portKey(wire.source, wire.sourcePort)] ?? 0, wire.width), style: { stroke: on ? '#34d399' : '#475569', strokeWidth: on ? 3 : 1.5 }, labelStyle: { fill: on ? '#6ee7b7' : '#94a3b8', fontWeight: 700 } } }
