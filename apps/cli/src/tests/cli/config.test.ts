// ---------------------------------------------------------------------------
// hadyancode config - CLI tests
//
// Covers:
//   - `hadyancode config --config <dir>` - shows config for specific directory
//   - `hadyancode config --help`         - help page
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test";
import { HADYANCODE_BIN, TERMINAL_WIDE } from "../helpers/constants.js";
import { hadyancodeEnv } from "../helpers/env.js";
import { expectVisible } from "../helpers/terminal.js";

test.describe("hadyancode config --help", () => {
	test.use({
		program: { file: HADYANCODE_BIN, args: ["config", "--help"] },
		...TERMINAL_WIDE,
		env: hadyancodeEnv("default"),
	});

	test("shows config help page", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--config"]);
	});
});
