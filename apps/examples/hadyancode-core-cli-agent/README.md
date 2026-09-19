# HadyanCode Core CLI Agent

An interactive terminal chat agent powered by the `HadyanCodeCore` runtime. This example is similar in spirit to [`cli-agent`](../cli-agent), but uses stateful HadyanCodeCore sessions and built-in runtime tools instead of the stateless `Agent` class, to leverage HadyanCode's internal agent harness.

## Getting started

Install dependencies:

```bash
bun install
bun run build:sdk
```

Set an API key:

```bash
export HADYANCODE_API_KEY="sk_..."
```

Run:

```bash
bun dev
```

Type any message at the `you:` prompt to see a streaming response. Type `exit` to quit.

## Optional model configuration

The example defaults to HadyanCode's gateway provider and Claude Sonnet:

```bash
export HADYANCODE_PROVIDER_ID="hadyancode"
export HADYANCODE_MODEL_ID="anthropic/claude-sonnet-4.6"
```

## What it does

- Creates a local `HadyanCodeCore` runtime with `HadyanCodeCore.create()`
- Starts one interactive session with `hadyancode.start()`
- Sends each user turn with `hadyancode.send({ sessionId, prompt })`
- Streams `agent_event` text to stdout as the assistant responds
- Logs tool calls and tool results inline
- Uses HadyanCodeCore's built-in tools instead of defining custom tools
- Calls `hadyancode.stop()` and `hadyancode.dispose()` during shutdown

## Concepts demonstrated

- Stateful sessions with `HadyanCodeCore`
- Multi-turn conversation using a single `sessionId`
- `CoreSessionEvent` subscription via `hadyancode.subscribe()`
- Built-in runtime tools (`read_files`, `search_codebase`, `run_commands`, etc.)
- Basic tool policies: file reads/search are auto-approved, other tools request approval

## Notes

Use this example when you want the full HadyanCodeCore runtime with sessions, persistence, and built-in tools. For the smallest possible SDK example, see [quickstart](../quickstart). For the lightweight stateless runtime, see [cli-agent](../cli-agent).
