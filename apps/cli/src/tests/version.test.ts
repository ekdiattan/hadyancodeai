import { test } from "@microsoft/tui-test";
import { HADYANCODE_BIN } from "./helpers/constants.js";
import { hadyancodeEnv } from "./helpers/env.js";
import { expectVisible } from "./helpers/terminal.js";

// ---------------------------------------------------------------------------
// hadyancode --version  (root flag)
// ---------------------------------------------------------------------------
test.describe("hadyancode --version", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["--version"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
	});

	test("prints the version string", async ({ terminal }) => {
		await expectVisible(terminal, /\d+\.\d+\.\d+/g);
	});
});

// ---------------------------------------------------------------------------
// hadyancode -V  (short flag)
// ---------------------------------------------------------------------------
test.describe("hadyancode -V", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["-V"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
	});

	test("prints the version string with short flag", async ({ terminal }) => {
		await expectVisible(terminal, /\d+\.\d+\.\d+/g);
	});
});

// ---------------------------------------------------------------------------
// hadyancode version  (subcommand)
// ---------------------------------------------------------------------------
test.describe("hadyancode version subcommand", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["version"] },
		env: hadyancodeEnv("claude-sonnet-4.6"),
	});

	test("prints 'HadyanCode CLI version:' message", async ({ terminal }) => {
		await expectVisible(terminal, /\d+\.\d+\.\d+/g);
	});
});
