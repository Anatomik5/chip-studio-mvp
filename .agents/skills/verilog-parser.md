# Verilog parser skill

Keep parsing behind `parseVerilogToNetlist`. A future WASM parser must return the shared `Netlist` schema and never leak parser ASTs into UI code. Reject malformed source with useful errors. Preserve module names, explicit widths, port directions, and sequential elements.