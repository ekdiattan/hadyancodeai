import { test } from "@microsoft/tui-test";
import { HADYANCODE_BIN } from "./helpers/constants.js";
import { hadyancodeEnv } from "./helpers/env.js";
import { expectVisible } from "./helpers/terminal.js";

const HELP_TERMINAL = { columns: 120, rows: 50 };

// ===========================================================================
// hadyancode --help  (root help)
// ===========================================================================
test.describe("hadyancode --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows Usage line and lists all subcommands", async ({ terminal }) => {
		await expectVisible(terminal, [
			"Usage:",
			"history|h",
			"auth [options]",
			"version",
			"update [options]",
			"hub ",
		]);
	});

	test("shows all root-level option flags", async ({ terminal }) => {
		await expectVisible(terminal, [
			"--plan",
			"--timeout",
			"--model",
			"--verbose",
			"--cwd",
			"--config",
			"--thinking",
			"--retries",
			"--json",
			"--acp",
			"--update",
		]);
	});
});

// ===========================================================================
// hadyancode -h  (short help flag)
// ===========================================================================
test.describe("hadyancode -h", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["-h"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows Usage line with short flag", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:");
	});
});

// ===========================================================================
// hadyancode history --help
// ===========================================================================
test.describe("hadyancode history --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["history", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows history usage and all flags", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--limit", "--page", "--config"]);
	});
});

// ===========================================================================
// hadyancode h --help  (history alias)
// ===========================================================================
test.describe("hadyancode h --help (history alias)", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["h", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows history usage and flags via alias", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--limit"]);
	});
});

// ===========================================================================
// hadyancode config --help
// ===========================================================================
test.describe("hadyancode config --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["config", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows config usage and --config flag", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--config"]);
	});
});

// ===========================================================================
// hadyancode auth --help
// ===========================================================================
test.describe("hadyancode auth --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["auth", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows auth usage and all flags", async ({ terminal }) => {
		await expectVisible(terminal, [
			"Usage:",
			"--provider",
			"--apikey",
			"--modelid",
			"--baseurl",
			"--config",
		]);
	});
});

// ===========================================================================
// hadyancode version --help
// ===========================================================================
test.describe("hadyancode version --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["version", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows version command usage", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:");
	});
});

// ===========================================================================
// hadyancode update --help
// ===========================================================================
test.describe("hadyancode update --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["update", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows update usage and --verbose flag", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--verbose"]);
	});
});

// ===========================================================================
// hadyancode doctor --help
// ===========================================================================
test.describe("hadyancode doctor --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["doctor", "--help"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	});

	test("shows doctor usage and lists fix and log subcommands", async ({
		terminal,
	}) => {
		await expectVisible(terminal, ["Usage:", "fix", "log"]);
	});
});
