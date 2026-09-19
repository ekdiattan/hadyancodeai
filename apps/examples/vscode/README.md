# `apps/examples/vscode` (`@hadyancode/vscode`)

VS Code extension that opens a chat webview and runs HadyanCode sessions over the RPC runtime.

## What it does

- Opens a webview panel via `HadyanCode: Open Chat in Editor`.
- Ensures a compatible owner-scoped RPC sidecar by running `hadyancode rpc ensure --json`.
- Starts/sends/aborts chat turns using RPC runtime methods (`StartRuntimeSession`, `SendRuntimeSession`, `AbortRuntimeSession`).
- Streams runtime events into the webview for incremental assistant output.

## Requirements

- `hadyancode` must already be installed and available on `PATH`.
- A provider/model should be configured in HadyanCode provider settings.

## Development

```bash
# Build extension bundle
bun -F @hadyancode/vscode build

# Typecheck
bun -F @hadyancode/vscode typecheck
```

To run locally in VS Code:

1. Build the extension: `bun -F @hadyancode/vscode build`.
2. Open `apps/examples/vscode` in VS Code.
3. Press `F5` to launch the Extension Development Host.
4. Run command `HadyanCode: Open Chat in Editor`.
