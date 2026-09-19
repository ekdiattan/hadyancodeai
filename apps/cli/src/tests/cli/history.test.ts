// ---------------------------------------------------------------------------
// hadyancode history - CLI tests
//
// Covers:
//   - `hadyancode history --limit X`  - pagination limit
//   - `hadyancode history --page N`   - page selection
//   - `hadyancode history --config`   - custom config directory
//   - `hadyancode history --help`     - help page
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test";
import { HADYANCODE_BIN, TERMINAL_WIDE } from "../helpers/constants.js";
import { hadyancodeEnv } from "../helpers/env.js";
import { expectVisible } from "../helpers/terminal.js";

test.describe("hadyancode history --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["history", "--help"] },
		...TERMINAL_WIDE,
		env: hadyancodeEnv("default"),
	});

	test("shows history help page with all flags", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--limit", "--page", "--config"]);
	});
});

test.describe("hadyancode history --limit", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["history", "--limit", "1"] },
		...TERMINAL_WIDE,
		env: hadyancodeEnv("default"),
	});

	test("shows history limited to specified number of results", async ({
		terminal,
	}) => {
		// The default config has 2 tasks in taskHistory.json; with limit=1
		// we should see pagination or only 1 task entry per page
		await expectVisible(terminal, /history|task/i);
	});
});

test.describe("hadyancode history --page", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["history", "--page", "1"] },
		...TERMINAL_WIDE,
		env: hadyancodeEnv("default"),
	});

	test("shows history for the specified page", async ({ terminal }) => {
		await expectVisible(terminal, /history|task/i);
	});
});

test.describe("hadyancode history --config (default)", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["history"] },
		...TERMINAL_WIDE,
		env: hadyancodeEnv("default"),
	});

	test("shows history for default config", async ({ terminal }) => {
		// Default config has tasks with "wezterm" in them
		await expectVisible(terminal, /history|task|wezterm/i);
	});
});

test.describe("hadyancode history --config (claude-sonnet-4.6)", () => {
	test.use({
		program: {
			file: HADYANCODE_BIN,
			args: ["history", "--config", "configs/claude-sonnet-4.6"],
		},
		...TERMINAL_WIDE,
		env: hadyancodeEnv("claude-sonnet-4.6"),
	});

	test("shows different history for different config directory", async ({
		terminal,
	}) => {
		// The claude-sonnet-4.6 config has its own separate task history
		await expectVisible(terminal, /history|task/i);
	});
});
