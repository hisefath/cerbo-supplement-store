# Mermaid syntax

These are the raw Mermaid sources for every diagram in [SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md). Each file holds one diagram; paste it into [mermaid.live](https://mermaid.live) to edit. All six are validated by rendering them with Mermaid 11. `SYSTEM_DESIGN.md` embeds identical copies, so edit these sources and re-embed rather than editing both.

| File | Diagram | Shows |
|---|---|---|
| [architecture.mmd](architecture.mmd) | flowchart | Clients → thin HTTP layer → domain services → seams (stubbed adapters) → DB |
| [erd.mmd](erd.mmd) | erDiagram | Tables, keys, snapshots, and money columns (integer cents) |
| [payment-sequence.mmd](payment-sequence.mmd) | sequenceDiagram | Reserve → charge → settle, idempotent replay, decline, and unknown outcomes |
| [order-state.mmd](order-state.mmd) | stateDiagram | `awaiting_payment → processing → paid`, decline back to awaiting, and cancel |
| [money-flow.mmd](money-flow.mmd) | flowchart | Where the patient's $63.99 goes: COGS, provider payable, 75 bps fee |
| [deployment.mmd](deployment.mmd) | flowchart | Railway: the FrankenPHP app plus managed Postgres |
