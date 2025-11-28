# Frontend Evaluation Panel

This document explains how the evaluation panel in the chat UI works, what data it captures, and how to use it to verify calculations returned by the server.

The evaluation UI lives in `src/ui/chat.ts`. It is designed to make the server’s computation fully inspectable and re-runnable in the browser, so you can validate correctness and understand any discrepancies.

## What it captures

During a streamed conversation, the UI captures two key events emitted by the LLM tool orchestration:

1. `fetch_game_data` call and result
   - Stores the last fetch filters and a preview of the result.
   - Displays `count`, optional `summary` (averages, min/max, shown), and any `warning`/`suggestion` returned by the tool (e.g., for sparse Metacritic coverage).
2. `execute_calculation` call and result
   - Creates a deterministic “snapshot” entry in `calcHistory` for each calculation.
   - The snapshot includes:
     - `hash`: a stable hash derived from a stable JSON stringification of the data payload (used to identify snapshots)
     - `code`: the exact server-side code that ran
     - `data`: the exact data object (`{ games: [...] }`, typically) passed to the calculation
     - `serverResult`: the server’s returned result object once available
     - Timestamps and local UI state for later manual runs

Snapshots accumulate as the agent performs more calculations. You can switch between them from a dropdown and optionally “follow latest” automatically while streaming.

## How manual re-run works

The right-side panel lets you re-run the server’s calculation locally in your browser:

- The “Manual calculation (browser)” section shows a text area with the calculation `code` (editable).
- Clicking “Calculate manually” executes the code against the captured `data` snapshot.
- The browser execution provides the same helper functions as the server:
  - `avg(array<number>)`
  - `sum(array<number>)`
  - `min(array<number>)`
  - `max(array<number>)`
  - `groupBy(array<object>, keyPath: string)` with nested key support (e.g., `"genres"`, `"platforms.0.platform.name"`)
- If the code contains a top-level `return`, it is automatically wrapped (IIFE style) so the browser can execute it cleanly.
- The manual result is displayed in the panel after execution.

Notes:
- Manual execution in the browser uses a sandboxed `new Function` with only the provided helpers and `data`. It is intended for numerical/statistical logic on the captured dataset.
- You can modify the code to inspect alternative logic without needing to re-run the server.
- “Copy code” copies the current manual code to your clipboard.
- “Download data.json” downloads the data snapshot used for this calculation.
- “Sync server code” restores the text area to the exact code that ran on the server for this snapshot.

## PASS/FAIL comparison

When a server result exists and you manually re-run the code, the panel compares:
- Server value: `serverResult.result`
- Manual value: the value returned by your manual run

Comparison uses a stable JSON stringification (keys sorted, arrays preserved) so that semantically equal objects are considered equal. The panel then shows:
- `PASS` if equal
- `FAIL` if different

This provides a quick check that the server’s computation matches what you can reproduce locally with the same data and code.

## Streaming behavior and layout

- While the agent streams, the UI shows two assistant message “bubbles”:
  - The first accumulates the agent’s initial reasoning text and tool calls.
  - After tool calls, a separate final answer bubble shows the concluding explanation.
- The evaluation panel stays in sync with streamed tool events:
  - On `tool-call` for `execute_calculation`, a new snapshot is created.
  - On `tool-result`, the `serverResult` is attached to the corresponding snapshot.
- The panel supports:
  - “Follow latest” to always track the most recent snapshot during streaming.
  - Selecting any prior snapshot from a dropdown to inspect and re-run it.
  - Collapsible “Tool Calls” in the chat to view each call’s Input and Output.

## What to expect

- The panel is an inspection and verification aid, not a full E2E test runner.
- It is most useful to:
  - Confirm the server is using the intended data fields and filters.
  - Verify numerical/statistical code against the captured snapshot.
  - Explain discrepancies by modifying code and observing differences.
- For large datasets, the `fetch_game_data` tool may include `summary` statistics to avoid shipping all games over the wire, while still enabling verification for aggregated metrics.

## Common tips

- If Metacritic coverage is sparse for the selected time period, the `fetch_game_data` result may include `warning` and `suggestion`. Consider using `rating` for better coverage when working with recent years.
- Keep `page_size` reasonable (20–30) for most statistical queries; this is generally sufficient and improves performance.
- Use `groupBy` for operations like “average rating by genre” or “count by platform”.


