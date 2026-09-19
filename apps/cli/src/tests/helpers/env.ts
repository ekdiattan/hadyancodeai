// ---------------------------------------------------------------------------
// Environment helpers for test setup.
//
// Usage:
//   test.use({ env: hadyancodeEnv("default") });
//   test.use({ env: hadyancodeEnv("claude-sonnet-4.6") });
//   test.use({ env: hadyancodeEnv("/absolute/path/to/config") });
// ---------------------------------------------------------------------------

import { cpSync, mkdirSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const TEST_SUITE_ROOT = new URL("../", import.meta.url).pathname;

let envCounter = 0;

function createIsolatedHadyanCodeDir(sourceDir: string): string {
	const tempRoot = mkdtempSync(path.join(os.tmpdir(), "hadyancode-tui-test-"));
	const targetDir = path.join(tempRoot, "hadyancode");
	cpSync(sourceDir, targetDir, {
		recursive: true,
		errorOnExist: false,
		force: true,
	});
	mkdirSync(path.join(targetDir, "home"), { recursive: true });
	return targetDir;
}

function nextHubPort(): string {
	envCounter += 1;
	const basePort = 30_000 + (process.pid % 10_000);
	return String(basePort + (envCounter % 10_000));
}

/**
 * Build the process environment for a hadyancode test.
 *
 * @param configDir - Named config under `configs/`, or an absolute path.
 * @param extra     - Additional env vars to merge in (override defaults).
 */
export function hadyancodeEnv(
	configDir: string,
	extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
	const hadyancodePath = path.isAbsolute(configDir)
		? configDir
		: path.join(TEST_SUITE_ROOT, "configs", configDir);
	const isolatedHadyanCodePath = createIsolatedHadyanCodeDir(hadyancodePath);
	const dataDir = path.join(isolatedHadyanCodePath, "data");

	// Determine effective VCR mode: extra overrides > parent env > default "playback"
	const effectiveVcrMode =
		extra.HADYANCODE_VCR ?? process.env.HADYANCODE_VCR ?? "playback";

	// During recording, authenticated configs read real OAuth credentials from
	// ~/.hadyancode/data/settings/providers.json while keeping all other settings
	// (model, provider, global state) from the mock config directory.
	const isRecording = effectiveVcrMode === "record";
	const isAuthenticated = configDir !== "unauthenticated";
	const realProvidersFile =
		isRecording && isAuthenticated
			? path.join(os.homedir(), ".hadyancode", "data", "settings", "providers.json")
			: undefined;

	// Remove CI so terminal renderers treat the spawned process as interactive.
	// Remove VITEST so the spawned CLI binary doesn't skip initVcr().
	// cli/src/index.ts guards `initVcr` behind `process.env.VITEST !== "true"`,
	// so if the parent vitest process's VITEST=true leaks into the child, VCR
	// recording/playback is silently skipped.
	const { CI: _ci, VITEST: _vitest, ...cleanEnv } = process.env;
	if (!isAuthenticated) {
		delete cleanEnv.HADYANCODE_API_KEY;
	}

	// Only enable VCR when a cassette path is provided (via extra or parent env),
	// otherwise tests without cassettes would trigger a spurious
	// "[VCR] No HADYANCODE_VCR_CASSETTE" warning on every run.
	const hasCassette = !!(
		extra.HADYANCODE_VCR_CASSETTE ?? process.env.HADYANCODE_VCR_CASSETTE
	);
	const vcrDefaults = hasCassette
		? { HADYANCODE_VCR: "playback", HADYANCODE_VCR_FILTER: "" }
		: {};

	// the order of these env vars matter; later ones override earlier ones
	return {
		...vcrDefaults,
		...cleanEnv,
		...(realProvidersFile
			? { HADYANCODE_PROVIDER_SETTINGS_PATH: realProvidersFile }
			: {}),
		HADYANCODE_TELEMETRY_DISABLED: "1",
		HOME: path.join(isolatedHadyanCodePath, "home"),
		HADYANCODE_DIR: isolatedHadyanCodePath,
		HADYANCODE_DATA_DIR: dataDir,
		HADYANCODE_DB_DATA_DIR: path.join(dataDir, "db"),
		HADYANCODE_GLOBAL_SETTINGS_PATH: path.join(
			dataDir,
			"settings",
			"global-settings.json",
		),
		HADYANCODE_HOOKS_LOG_PATH: path.join(dataDir, "logs", "hooks.jsonl"),
		HADYANCODE_HUB_DISCOVERY_PATH: path.join(
			dataDir,
			"locks",
			"hub",
			"discovery.json",
		),
		HADYANCODE_HUB_PORT: nextHubPort(),
		HADYANCODE_MCP_SETTINGS_PATH: path.join(
			dataDir,
			"settings",
			"hadyancode_mcp_settings.json",
		),
		...(realProvidersFile
			? {}
			: {
					HADYANCODE_PROVIDER_SETTINGS_PATH: path.join(
						dataDir,
						"settings",
						"providers.json",
					),
				}),
		HADYANCODE_SESSION_DATA_DIR: path.join(dataDir, "sessions"),
		HADYANCODE_TEAM_DATA_DIR: path.join(dataDir, "teams"),
		HADYANCODE_DISABLE_HADYANCODE_PASS_NOTICE: "1",
		NO_UPDATE_NOTIFIER: "1",
		HADYANCODE_NO_AUTO_UPDATE: "1",
		...extra,
	};
}
