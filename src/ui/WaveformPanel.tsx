import type { ClockCycleState, Netlist } from '../types/netlist'
import { formatSignal } from '../types/netlist'

export default function WaveformPanel({ history, netlist }: { history: ClockCycleState[]; netlist: Netlist }) {
  const signals = Object.keys(history[history.length - 1]?.signals ?? {}).slice(0, 6)
  if (!history.length || !signals.length) return <div className="text-xs text-slate-500">Step the clock to capture waveforms.</div>
  const widthFor = (key: string) => { const [nodeId, portId] = key.split('.'); return netlist.nodes.find(n => n.id === nodeId)?.ports.find(p => p.id === portId)?.width ?? 1 }
  return <div className="space-y-2">{signals.map(key => { const width = widthFor(key); return <div key={key} className="grid grid-cols-[76px_1fr] items-center gap-2 text-[10px]"><span className="truncate text-slate-400">{key}</span><div className="flex h-6 items-end gap-px rounded bg-slate-900 p-1">{history.slice(-12).map((frame, index) => { const value = frame.signals[key] ?? 0, active = value !== 0; return <span key={`${frame.cycle}-${index}`} title={`Cycle ${frame.cycle}: ${formatSignal(value, width)}`} className={`flex-1 rounded-sm ${active ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-slate-700'}`} style={{ height: active ? `${Math.max(35, Math.min(100, 35 + value * 8))}%` : '18%' }} /> })}</div></div> })}</div>
}
