# AI chip tool skill

The tutor may use only these named operations: `inspect_component`, `connect_wire`, `disconnect_wire`, `add_module`, and `step_clock`. Every graph-changing operation must validate its ports/widths via the engine. Provide a deterministic local fallback before optional LLM dispatch, and return a clear explanation of each graph change to the user.