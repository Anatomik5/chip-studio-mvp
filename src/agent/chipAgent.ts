import type { CircuitNode, Netlist } from '../types/netlist'
import { validateWire } from '../types/netlist'

export type AgentTool = 'inspect_component' | 'connect_wire' | 'disconnect_wire' | 'add_module' | 'step_clock'
export type ToolCall = { name: AgentTool; arguments: Record<string, unknown> }
export type AgentResult = { message: string; highlight?: string; steps?: number; netlist?: Netlist; toolCalls?: ToolCall[] }
export type LlmConfig = { provider: 'local' | 'openai' | 'anthropic'; apiKey?: string; model?: string; endpoint?: string }
export type CpuChallenge = { id: string; title: string; symptom: string; hint: string; missingWire: string; source: string; sourcePort: string; target: string; targetPort: string }

export const cpuChallenges: CpuChallenge[] = [
  { id: 'datapath', title: 'Broken accumulator path', symptom: 'The ALU has no value on input A.', hint: 'The accumulator output should drive the ALU A input; both are 4-bit buses.', missingWire: 'a-alu', source: 'a', sourcePort: 'out', target: 'alu', targetPort: 'a' },
  { id: 'result', title: 'Silent result register', symptom: 'The ALU computes a value, but the Result register stays dark.', hint: 'Trace the 4-bit Result output of the ALU to its display input.', missingWire: 'alu-result', source: 'alu', sourcePort: 'out', target: 'result', targetPort: 'in' },
  { id: 'flags', title: 'Lost Zero flag', symptom: 'Arithmetic works, but branch logic cannot observe a zero result.', hint: 'The Zero flag is a single-bit signal; find its matching one-bit destination.', missingWire: 'alu-zero', source: 'alu', sourcePort: 'zero', target: 'zero', targetPort: 'in' },
]

export function startChallenge(challenge: CpuChallenge, netlist: Netlist): AgentResult {
  return { message: `${challenge.title}: ${challenge.symptom} Ask for a hint or reconnect the missing path.`, netlist: { ...netlist, name: `Fix CPU: ${challenge.title}`, wires: netlist.wires.filter(w => w.id !== challenge.missingWire) } }
}
export function checkChallenge(challenge: CpuChallenge, netlist: Netlist): AgentResult {
  const fixed = netlist.wires.some(w => w.source === challenge.source && w.sourcePort === challenge.sourcePort && w.target === challenge.target && w.targetPort === challenge.targetPort)
  return fixed ? { message: `Solved: ${challenge.title}. The required signal is connected again.`, highlight: challenge.target } : { message: `Not fixed yet. Hint: ${challenge.hint}`, highlight: challenge.target }
}

export function runToolCall(call: ToolCall, netlist: Netlist): AgentResult {
  const args = call.arguments
  if (call.name === 'inspect_component') {
    const id = String(args.nodeId ?? '')
    const node = netlist.nodes.find(n => n.id === id || n.label.toLowerCase() === id.toLowerCase())
    return { message: node ? `${node.label} is a ${node.kind} with ${node.ports.length} port(s).` : 'Component not found.', highlight: node?.id }
  }
  if (call.name === 'step_clock') { const steps = Math.max(1, Math.min(32, Number(args.steps) || 1)); return { message: `Advancing ${steps} clock cycle${steps === 1 ? '' : 's'}.`, steps } }
  if (call.name === 'disconnect_wire') {
    const wireId = String(args.wireId ?? '')
    if (!netlist.wires.some(w => w.id === wireId)) return { message: 'Wire not found; no connection was removed.' }
    return { message: 'Wire disconnected.', netlist: { ...netlist, wires: netlist.wires.filter(w => w.id !== wireId) } }
  }
  if (call.name === 'connect_wire') {
    const source = String(args.source ?? ''), sourcePort = String(args.sourcePort ?? ''), target = String(args.target ?? ''), targetPort = String(args.targetPort ?? '')
    const check = validateWire(netlist, { source, sourcePort, target, targetPort })
    if (!check.ok) return { message: check.error! }
    if (netlist.wires.some(w => w.source === source && w.sourcePort === sourcePort && w.target === target && w.targetPort === targetPort)) return { message: 'Those ports are already connected.' }
    return { message: 'Wire connected after bit-width validation.', netlist: { ...netlist, wires: [...netlist.wires, { id: `wire-${Date.now()}`, source, sourcePort, target, targetPort, width: check.width! }] } }
  }
  if (call.name === 'add_module') {
    const node = moduleFor(String(args.kind ?? 'gate'), String(args.operation ?? 'AND'))
    return { message: `Added ${node.label}.`, highlight: node.id, netlist: { ...netlist, nodes: [...netlist.nodes, node] } }
  }
  return { message: 'Unsupported tool call.' }
}

function moduleFor(kind: string, operation: string): CircuitNode {
  const id = `module-${Date.now()}`
  if (kind === 'register') return { id, label: '4-bit register', kind: 'register', x: 370, y: 480, ports: [{ id: 'd', label: 'D', direction: 'input', width: 4 }, { id: 'q', label: 'Q', direction: 'output', width: 4 }] }
  if (kind === 'mux') return { id, label: '4-bit MUX', kind: 'mux', x: 370, y: 480, ports: [{ id: 'a', label: 'A', direction: 'input', width: 4 }, { id: 'b', label: 'B', direction: 'input', width: 4 }, { id: 'sel', label: 'SEL', direction: 'input', width: 1 }, { id: 'out', label: 'OUT', direction: 'output', width: 4 }] }
  const gateOperation = operation.toUpperCase() === 'XOR' ? 'XOR' : 'AND'
  return { id, label: `${gateOperation} gate`, kind: 'gate', x: 370, y: 480, data: { operation: gateOperation }, ports: [{ id: 'a', label: 'A', direction: 'input', width: 1 }, { id: 'b', label: 'B', direction: 'input', width: 1 }, { id: 'out', label: 'OUT', direction: 'output', width: 1 }] }
}

export function dispatchTutor(text: string, netlist: Netlist): AgentResult {
  const lower = text.toLowerCase()
  if (/hint/.test(lower)) return { message: `Hint: ${cpuChallenges.map(c => c.hint).join(' ')}` }
  if (/step\s+(\d+)/.test(lower)) return runToolCall({ name: 'step_clock', arguments: { steps: Number(lower.match(/step\s+(\d+)/)?.[1]) } }, netlist)
  if (/step|clock cycle/.test(lower)) return runToolCall({ name: 'step_clock', arguments: { steps: 1 } }, netlist)
  if (/zero/.test(lower)) return { message: 'The Zero flag is 1 when the ALU result is exactly 0. It is recalculated whenever an input or operation changes.', highlight: 'alu' }
  if (/how.*alu|alu.*work/.test(lower)) return { message: 'This 4-bit ALU receives A and B. Mode = 0 adds them; Mode = 1 XORs them. Result and Zero update live.', highlight: 'alu' }
  if (/add.*(and|xor|register|mux|multiplexer)/.test(lower)) return runToolCall({ name: 'add_module', arguments: { kind: /register/.test(lower) ? 'register' : /mux|multiplexer/.test(lower) ? 'mux' : 'gate', operation: /xor/.test(lower) ? 'XOR' : 'AND' } }, netlist)
  if (/inspect/.test(lower)) { const node = netlist.nodes.find(n => lower.includes(n.label.toLowerCase())) ?? netlist.nodes.find(n => n.kind === 'alu'); return runToolCall({ name: 'inspect_component', arguments: { nodeId: node?.id } }, netlist) }
  if (/connect/.test(lower)) return { message: 'Drag output to input, or ask the AI to connect named ports. Every connection is checked for direction and matching bit width.' }
  return { message: 'Try “How does this ALU work?”, “Add an AND gate”, “Step 3 clock cycles”, or start a Fix CPU challenge.' }
}

const tools = [
  { type: 'function', function: { name: 'inspect_component', description: 'Inspect a circuit node', parameters: { type: 'object', properties: { nodeId: { type: 'string' } }, required: ['nodeId'] } } },
  { type: 'function', function: { name: 'connect_wire', description: 'Connect compatible output and input ports', parameters: { type: 'object', properties: { source: { type: 'string' }, sourcePort: { type: 'string' }, target: { type: 'string' }, targetPort: { type: 'string' } }, required: ['source', 'sourcePort', 'target', 'targetPort'] } } },
  { type: 'function', function: { name: 'disconnect_wire', description: 'Remove a wire by id', parameters: { type: 'object', properties: { wireId: { type: 'string' } }, required: ['wireId'] } } },
  { type: 'function', function: { name: 'add_module', description: 'Add a gate, mux, or register', parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['gate', 'mux', 'register'] }, operation: { type: 'string', enum: ['AND', 'XOR'] } }, required: ['kind'] } } },
  { type: 'function', function: { name: 'step_clock', description: 'Advance clock cycles', parameters: { type: 'object', properties: { steps: { type: 'number' } } } } },
]
const system = 'You are a chip design tutor. Use tools for graph mutations. Never propose a connection whose widths are unknown; the application validates every tool call.'

export async function askTutor(text: string, netlist: Netlist, config: LlmConfig): Promise<AgentResult> {
  if (config.provider === 'local' || !config.apiKey) return dispatchTutor(text, netlist)
  try {
    const remote = config.provider === 'anthropic' ? await askAnthropic(text, netlist, config) : await askOpenAi(text, netlist, config)
    let model = netlist, result: AgentResult = { message: remote.message || 'I reviewed the circuit.' }
    for (const call of remote.calls) { const next = runToolCall(call, model); if (next.netlist) model = next.netlist; result = { ...next, netlist: next.netlist ?? model, toolCalls: [...(result.toolCalls ?? []), call] } }
    return remote.calls.length ? { ...result, message: `${remote.message}\n${result.message}` } : result
  } catch (error) { const fallback = dispatchTutor(text, netlist); return { ...fallback, message: `The ${config.provider} request could not be completed; local tutor fallback is active. ${fallback.message}` } }
}
async function askOpenAi(text: string, netlist: Netlist, config: LlmConfig) {
  const response = await fetch(config.endpoint || 'https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: `${text}\nNetlist: ${JSON.stringify(netlist)}` }], tools, tool_choice: 'auto' }) })
  if (!response.ok) throw new Error(`Provider returned ${response.status}`)
  const choice = (await response.json()).choices?.[0]?.message
  return { message: choice?.content ?? '', calls: (choice?.tool_calls ?? []).map((call: { function: { name: AgentTool; arguments: string } }) => ({ name: call.function.name, arguments: JSON.parse(call.function.arguments) })) as ToolCall[] }
}
async function askAnthropic(text: string, netlist: Netlist, config: LlmConfig) {
  const response = await fetch(config.endpoint || 'https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey!, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: config.model || 'claude-3-5-haiku-latest', max_tokens: 800, system, messages: [{ role: 'user', content: `${text}\nNetlist: ${JSON.stringify(netlist)}` }], tools: tools.map(tool => ({ name: tool.function.name, description: tool.function.description, input_schema: tool.function.parameters })) }) })
  if (!response.ok) throw new Error(`Provider returned ${response.status}`)
  const content = (await response.json()).content ?? []
  return { message: content.filter((part: { type: string }) => part.type === 'text').map((part: { text: string }) => part.text).join('\n'), calls: content.filter((part: { type: string }) => part.type === 'tool_use').map((part: { name: AgentTool; input: Record<string, unknown> }) => ({ name: part.name, arguments: part.input })) as ToolCall[] }
}
