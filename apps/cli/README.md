# HadyanCode CLI

<p align="center">
  <img src="https://github.com/user-attachments/assets/7123f9d1-afeb-48d5-93fa-e750dec0ebba" width="70%" />
</p>

<div align="center">
<table>
<tbody>
<td align="center">
<a href="https://www.npmjs.com/package/hadyancode" target="_blank">NPM</a>
</td>
<td align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev" target="_blank">VS Code Extension</a>
</td>
<td align="center">
<a href="https://discord.gg/hadyancode" target="_blank">Discord</a>
</td>
<td align="center">
<a href="https://www.reddit.com/r/hadyancode/" target="_blank">r/hadyancode</a>
</td>
<td align="center">
<a href="https://github.com/cline/hadyancode/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop" target="_blank">Feature Requests</a>
</td>
<td align="center">
<a href="https://docs.cline.bot" target="_blank">Docs</a>
</td>
</tbody>
</table>
</div>

Run HadyanCode in your terminal. Interactive chat for paired sessions, or fully headless for CI/CD and scripting. The CLI shares its agent core with the [HadyanCode VS Code extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev), JetBrains plugin, and SDK, so plan/act modes, MCP servers, checkpoints, rules, skills, and provider configuration all behave the same across surfaces.

## Install

```sh
npm install -g cline
```

For nightly builds:

```sh
npm install -g cline@nightly
```

Platform binaries are published for macOS, Linux, and Windows on `arm64` and `x64`. The `hadyancode` package resolves the correct binary for your platform via optional dependencies, so no Node, Bun, or Zig runtime is required at install time.

## Quick start

Run interactively:

```sh
hadyancode
```

Run a single prompt:

```sh
hadyancode "Audit this package and propose fixes"
```

Pipe input:

```sh
cat file.txt | hadyancode "Summarize this"
```

See `hadyancode --help` for the full flag reference.

## Use any provider

HadyanCode supports the same providers as the VS Code extension. You can sign in to HadyanCode directly, use your ChatGPT Subscription through `openai-codex`, or bring an API key from Anthropic, OpenAI, Google Gemini, OpenRouter, AWS Bedrock, GCP Vertex, Cerebras, Groq, and any OpenAI-compatible endpoint.

```sh
hadyancode auth                              # interactive sign-in
hadyancode auth hadyancode                        # OAuth sign-in
hadyancode auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
```

`hadyancode auth` without a provider opens the interactive auth setup TUI with the same options as the old CLI flow (Sign in with HadyanCode, Sign in with ChatGPT Subscription, Sign in with OCA, or use your own API key).

OAuth-supported providers (`hadyancode`, `openai-codex`, `oca`) do not auto-launch a browser on normal startup. Authenticate explicitly first with `hadyancode auth <provider>`. For non-interactive runs, if an OAuth provider is selected and no saved credentials are available, `hadyancode` fails fast with an authentication message instead of launching a hidden browser flow.

## Modes

HadyanCode CLI runs in a few different shapes depending on what you need:

- Interactive TUI: `hadyancode` or `hadyancode -i` opens a full terminal UI with plan/act toggle, slash commands, file mentions, and live tool approvals
- One-shot: `hadyancode "your prompt"` runs a single turn and exits
- JSON: `hadyancode --json "..."` streams NDJSON events for piping into other tools
- Yolo: `hadyancode --yolo "..."` skips approval prompts and exits when the turn finishes
- Zen: `hadyancode --zen "..."` fires the task to the background hub daemon and exits immediately (see below)

## Headless mode for CI/CD

Run HadyanCode with zero interaction for scripting and automation. Pipe input, get JSON output, chain commands, integrate into CI/CD pipelines.

```sh
# One-shot prompt, auto-approve all tools
hadyancode --yolo "Run tests and fix any failures"

# Pipe a diff in for review
git diff origin/main | hadyancode "Review these changes for issues"

# NDJSON output for downstream tooling
hadyancode --json "List all TODO comments" | jq -r 'select(.type == "agent_event" and .event.text) | .event.text'
```

## Features

- Streaming TUI built on [OpenTUI](https://github.com/sst/opentui) with markdown rendering, syntax-highlighted diffs, scrollable chat, and mouse support
- Plan/Act mode toggle for switching between planning and execution
- Native MCP support for connecting custom tools
- Checkpoints with `/undo` to rewind workspace state
- Sub-agent spawning and agent teams for parallel work
- OAuth login for HadyanCode, ChatGPT Subscription (`openai-codex`), and OCA
- Configurable thinking budgets per run
- Cron and event-driven schedules for recurring agent work
- Chat connectors for Telegram, Google Chat, and WhatsApp

## Usage

```sh
# Start HadyanCode CLI without a prompt to enter interactive mode
hadyancode

# Single prompt (one-shot) - includes tools, spawn, and teams
hadyancode "Audit this package and propose fixes"

# Interactive mode with a starting prompt
hadyancode -i "Let's work on this together. First, analyze the current state."

# With a custom system prompt
hadyancode -i -s "You are a pirate" "Tell me about the sea"

# Require approval before each tool call
hadyancode --auto-approve false "Inspect and modify this repository"

# Explicit yolo: enables submit_and_exit and disables spawn/team tools by default
hadyancode --yolo --retries 5 "Refactor this package"

# Override consecutive internal mistake (retry) limit (default: 3)
hadyancode --retries 5 "Fix failing tests"

# Team workflow with persistent name
hadyancode --team-name my-team "Plan, implement, and verify release checklist"
hadyancode --team-name my-team "Continue yesterday's team workflow"

# Show verbose run stats (elapsed time, tokens, estimated cost when available)
hadyancode -v "Explain quantum computing"

# Use a specific provider, model, and access token for a single prompt
hadyancode -P openrouter -m google/gemini-3-pro -k sk-... "Set up a storybook"

# Use a different model with the last used provider
hadyancode -m anthropic/claude-opus-4-6 "Explain string theory"

# Stream structured NDJSON output
hadyancode --json "Summarize this repository"

# Quick provider setup
hadyancode auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
hadyancode auth --provider openai-native --apikey sk-... --modelid gpt-5 --baseurl https://api.example.com/v1
```

### MCP servers

Manage MCP servers with the interactive wizard:

```sh
hadyancode mcp
hadyancode config mcp
```

Open the add-server wizard with the name, transport, and command or URL already filled in with `hadyancode mcp install` (`hadyancode mcp add` also works). Stdio servers use everything after `--` as the command and arguments:

```sh
hadyancode mcp install fs -- npx -y @modelcontextprotocol/server-filesystem /tmp
```

Remote HTTP and SSE servers take a name, transport, and URL. The wizard still asks for auth details before saving:

```sh
hadyancode mcp install ctx7 --transport http https://mcp.context7.com/mcp
hadyancode mcp install events --transport sse https://example.com/sse
```

Because this command opens the wizard, it requires a TTY.

### Connectors

Bridge a chat surface into RPC-backed HadyanCode sessions. Each conversation thread maps to a session with full context. Supported platforms: Telegram, Slack, Google Chat, WhatsApp, and Linear.

```sh
# Telegram (polling mode)
hadyancode connect telegram -k 123456:ABCDEF...

# Slack (webhook mode)
hadyancode connect slack --bot-token $SLACK_BOT_TOKEN --signing-secret $SLACK_SIGNING_SECRET --base-url https://your-domain.com

# Slack (socket mode)
hadyancode connect slack --bot-token $SLACK_BOT_TOKEN --app-token $SLACK_APP_TOKEN

# Google Chat (webhook mode)
hadyancode connect gchat --base-url https://your-domain.com

# WhatsApp (webhook mode)
hadyancode connect whatsapp --base-url https://your-domain.com

# Linear (webhook mode)
hadyancode connect linear --api-key $LINEAR_API_KEY --base-url https://your-domain.com

# Stop connector bridges and delete their sessions
hadyancode connect --stop
hadyancode connect --stop telegram
```

In chat surfaces, connector slash commands include `/help`, `/start`, `/new`, `/clear`, `/whereami`, `/tools`, `/yolo`, `/cwd <path>`, `/schedule`, `/abort`, and `/exit`. Run `hadyancode connect <adapter> --help` to see the full flag list for any adapter.

### Schedules

Schedule agents on cron-like intervals or external events.

If `--provider` and `--model` are omitted, schedules use the last configured
provider and model. If only `--provider` is given, the schedule uses that
provider's saved model.

```sh
hadyancode schedule create "Daily code review" \
  --cron "0 9 * * MON-FRI" \
  --prompt "Review PRs opened yesterday and summarize issues." \
  --workspace /path/to/repo \
  --timeout 3600 \
  --tags automation,review

hadyancode schedule list
hadyancode schedule get <schedule-id>
hadyancode schedule trigger <schedule-id>
hadyancode schedule history <schedule-id> --limit 20
hadyancode schedule export <schedule-id> > daily-review.yaml
hadyancode schedule import ./daily-review.yaml
```

Schedules can route results back to chat surfaces with `--delivery-adapter`, `--delivery-bot`, and `--delivery-thread`.

## Options

| Flag | Description |
|------|-------------|
| `-s, --system <prompt>` | Override the system prompt |
| `-P, --provider <id>` | Provider id (default: `hadyancode`) |
| `-m, --model <id>` | Model id (default: `anthropic/claude-sonnet-4.6`) |
| `-k, --key <api-key>` | API key override for this run |
| `-p, --plan` | Run in plan mode (default is act mode) |
| `-i, --tui` | Interactive TUI multi-turn mode |
| `-t, --timeout <seconds>` | Optional run timeout in seconds |
| `-c, --cwd <path>` | Working directory for tools |
| `--config <path>` | Configuration directory (used for CLI home resolution) |
| `--hooks-dir <path>` | Additional hooks directory hint for runtime hook injection |
| `--acp` | ACP (Agent Client Protocol) mode |
| `--thinking [none\|low\|medium\|high\|xhigh]` | Model thinking level when supported. Defaults to `medium` when the flag is provided without a level; thinking is off when the flag is omitted. |
| `--compaction <agentic\|basic\|off>` | Context compaction mode. Defaults to `agentic`; use `basic` for local truncation or `off` to disable. |
| `--retries <count>` | Maximum consecutive mistakes (retries) before halting (default: `3`) |
| `--json` | Output NDJSON instead of styled text |
| `--data-dir <path>` | Use isolated local state at `<path>` instead of `~/.hadyancode/data` (enables sandbox mode automatically) |
| `--auto-approve [true\|false]` | Set tool auto-approval for all tools |
| `--kanban` | Run the external `kanban` app |
| `-y, --yolo` | Skip tool approval prompts, enable `submit_and_exit`, and disable spawn/team tools by default |
| `-z, --zen` | Dispatch the task to the background hub and exit the CLI immediately |
| `--team-name <name>` | Override the runtime team state name |
| `-h, --help` | Show help and exit |
| `-v, --verbose` | Show verbose runtime diagnostics |
| `-V, --version` | Show version and exit |

`--json` is non-interactive and requires either a prompt argument or piped stdin. `--key` takes precedence over environment variables.

## Top-level commands

- `hadyancode config` - Open the interactive config view
- `hadyancode history|h [options]` - List session history or manage saved sessions
- `hadyancode version` - Show CLI version
- `hadyancode update [options]` - Check for CLI and kanban updates
- `hadyancode auth <provider>` - Authenticate or seed provider credentials
- `hadyancode connect <adapter>` - Run a chat connector bridge (`telegram`, `gchat`, `whatsapp`)
- `hadyancode connect --stop [adapter]` - Stop connector bridge processes and their sessions
- `hadyancode schedule <command>` - Create and manage scheduled runs
- `hadyancode doctor` - Inspect local CLI health and stale processes
- `hadyancode doctor fix` - Kill stale local RPC listeners and old CLI processes
- `hadyancode doctor log` - Open the CLI runtime log file
- `hadyancode hook` - Handle a hook payload from stdin
- `hadyancode hub` - Manage the local hub daemon
- `hadyancode kanban` - Run the external `kanban` app, installing it first when needed

## Zen mode

`--zen` (alias `-z`) runs a task in the background hub daemon and exits the CLI immediately. It is intended for long-running tasks you want to fire off and walk away from.

```sh
hadyancode --zen "Refactor the authentication module and add unit tests"
```

Behavior:

- The CLI starts (or reuses) the local hub daemon, submits the task, then exits. It does not stream output or stay attached to the session.
- Because there is no human in the loop once the CLI exits, zen sessions run with full tool auto-approval (same semantics as `--yolo`). `spawn`/`team` tools are disabled by default for safety, consistent with yolo-mode defaults.
- If the HadyanCode menubar app is running, it subscribes to hub `ui.notify` events and will surface a system notification when the task completes.
- If the menubar app is not running, there is no live UI for the task. Use `hadyancode history` later to find the session and inspect the result.
- `--zen` is incompatible with `--data-dir` (the implicit sandbox requires a local backend that exits with the CLI) and with `--tui` (there is no terminal UI to render into).

## Tool approval

Tool calls are auto-approved by default. Use `--auto-approve false` to require review before tool execution.

```sh
hadyancode --auto-approve false "Inspect and modify this repository"
```

When approval is required, the CLI prompts in TTY mode:

```text
Approve tool "<tool_name>" with input <preview>? [y/N]
```

- Enter `y` or `yes` to approve.
- Enter anything else (or press Enter) to reject.
- If stdin/stdout is not a TTY, required-approval calls are denied in terminal mode.

Desktop-integrated approval mode is also supported via env wiring (`HADYANCODE_TOOL_APPROVAL_MODE=desktop` and `HADYANCODE_TOOL_APPROVAL_DIR=<path>`). In desktop mode, CLI writes a request JSON file and waits for a matching decision JSON file.

## Environment variables

- `ANTHROPIC_API_KEY` - API key for Anthropic
- `HADYANCODE_API_KEY` - API key for HadyanCode (when using `-P hadyancode`)
- `OPENAI_API_KEY` - API key for OpenAI (when using `-P openai`)
- `OPENROUTER_API_KEY` - API key for OpenRouter (when using `-P openrouter`)
- `AI_GATEWAY_API_KEY` - API key for Vercel AI Gateway (when using `-P vercel-ai-gateway`)
- `V0_API_KEY` - API key for v0 (when using `-P v0`)
- `HADYANCODE_DATA_DIR` - Base data directory for sessions/settings/teams/hooks
- `HADYANCODE_SANDBOX` - Set to `1` to force sandbox mode
- `HADYANCODE_SANDBOX_DATA_DIR` - Override sandbox state directory
- `HADYANCODE_TEAM_DATA_DIR` - Override team persistence directory
- `HADYANCODE_BUILD_ENV` - Runtime build mode for SDK-owned subprocess launches
- `HADYANCODE_DEBUG_HOST` - Host for development inspector listeners (default `127.0.0.1`)
- `HADYANCODE_DEBUG_PORT_BASE` - Base inspector port for development child processes
- `HADYANCODE_TOOL_APPROVAL_MODE` - Approval mode (`desktop` uses file IPC; unset uses terminal prompt)
- `HADYANCODE_TOOL_APPROVAL_DIR` - Directory for desktop approval request/decision files
- `HADYANCODE_LOG_ENABLED` - Set to `0`/`false` to disable runtime file logging
- `HADYANCODE_LOG_LEVEL` - Runtime log level (`trace|debug|info|warn|error|fatal|silent`, default `info`)
- `HADYANCODE_LOG_PATH` - Runtime log file path (default `<HADYANCODE_DATA_DIR>/logs/hadyancode.log`)
- `HADYANCODE_LOG_NAME` - Logger name embedded in runtime log records
- `HADYANCODE_DEBUG` - Set to `1`/`true` to print wrapper diagnostics (e.g. the CA bundle summary)

`--key` takes precedence over environment variables.

## Certificate trust

The CLI automatically trusts your operating system's certificate store, so it
works behind corporate TLS-inspecting proxies and with self-signed/internal
endpoints without any setup. On launch the `hadyancode` wrapper harvests the OS trust
anchors and writes them to `~/.hadyancode/cli-node-extra-ca-certs.pem`, then points
the runtime's `NODE_EXTRA_CA_CERTS` at that bundle. The file is regenerated when
it changes and is safe to delete (it is rebuilt on the next run).

If you set `NODE_EXTRA_CA_CERTS` yourself, your certificates are **merged** into
that bundle alongside the system store rather than replacing it. Run with
`HADYANCODE_DEBUG=1` to see how many OS and user CAs were loaded and where the bundle
was written.

## Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development setup, monorepo structure, and TUI architecture. See [DISTRIBUTION.md](./DISTRIBUTION.md) for how the CLI is packaged and distributed.

## License

[Apache 2.0 © Cline Bot Inc.](https://github.com/cline/hadyancode/blob/main/LICENSE)
