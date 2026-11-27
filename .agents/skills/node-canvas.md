# Node canvas skill

Build UI nodes only from `CircuitNode` data and `ClockCycleState` snapshots. Dragging changes position; it must not alter simulation state. For a new edge, validate with `validateWire` before committing it. Render 1-bit values as 0/1 and wider values as padded hexadecimal. Use green animation for a non-zero live signal and a dim stroke otherwise.