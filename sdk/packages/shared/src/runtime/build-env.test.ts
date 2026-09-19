import { describe, expect, it } from "vitest";
import {
	augmentNodeCommandForDebug,
	HADYANCODE_BUILD_ENV_ENV,
	HADYANCODE_DEBUG_HOST_ENV,
	HADYANCODE_DEBUG_PORT_BASE_ENV,
	resolveHadyanCodeBuildEnv,
	withResolvedHadyanCodeBuildEnv,
} from "./build-env";

describe("build env helpers", () => {
	it("prefers explicit HADYANCODE_BUILD_ENV", () => {
		expect(
			resolveHadyanCodeBuildEnv({
				env: { [HADYANCODE_BUILD_ENV_ENV]: "development", NODE_ENV: "production" },
			}),
		).toBe("development");
	});

	it("treats development conditions as a development build", () => {
		expect(
			resolveHadyanCodeBuildEnv({
				env: {},
				execArgv: ["--conditions=development"],
			}),
		).toBe("development");
	});

	it("defaults to production otherwise", () => {
		expect(resolveHadyanCodeBuildEnv({ env: {}, execArgv: [] })).toBe("production");
	});

	it("treats NODE_ENV=development as a development build", () => {
		expect(
			resolveHadyanCodeBuildEnv({ env: { NODE_ENV: "development" }, execArgv: [] }),
		).toBe("development");
	});

	it("does not treat NODE_ENV=test as a development build", () => {
		expect(
			resolveHadyanCodeBuildEnv({ env: { NODE_ENV: "test" }, execArgv: [] }),
		).toBe("production");
	});

	it("does not treat NODE_ENV=staging as a development build", () => {
		expect(
			resolveHadyanCodeBuildEnv({ env: { NODE_ENV: "staging" }, execArgv: [] }),
		).toBe("production");
	});

	it("materializes HADYANCODE_BUILD_ENV when absent", () => {
		expect(
			withResolvedHadyanCodeBuildEnv({ NODE_ENV: "development" }, { execArgv: [] })[
				HADYANCODE_BUILD_ENV_ENV
			],
		).toBe("development");
	});

	it("adds dynamic inspect and source maps for node commands in development", () => {
		expect(
			augmentNodeCommandForDebug(["node", "script.js"], {
				env: { [HADYANCODE_BUILD_ENV_ENV]: "development" },
				debugRole: "rpc",
			}),
		).toEqual([
			"node",
			"--inspect=127.0.0.1:0",
			"--enable-source-maps",
			"script.js",
		]);
	});

	it("allows overriding the debug host and base port", () => {
		expect(
			augmentNodeCommandForDebug(["node", "script.js"], {
				env: {
					[HADYANCODE_BUILD_ENV_ENV]: "development",
					[HADYANCODE_DEBUG_HOST_ENV]: "0.0.0.0",
					[HADYANCODE_DEBUG_PORT_BASE_ENV]: "9500",
				},
				debugRole: "plugin-sandbox",
			}),
		).toEqual([
			"node",
			"--inspect=0.0.0.0:9502",
			"--enable-source-maps",
			"script.js",
		]);
	});

	it("adds inspect and source maps for bun commands in development", () => {
		expect(
			augmentNodeCommandForDebug(["/usr/local/bin/bun", "script.js"], {
				env: { [HADYANCODE_BUILD_ENV_ENV]: "development" },
				debugRole: "rpc",
			}),
		).toEqual([
			"/usr/local/bin/bun",
			"--inspect=127.0.0.1:0",
			"--enable-source-maps",
			"script.js",
		]);
	});

	it("does not duplicate existing node debug flags", () => {
		expect(
			augmentNodeCommandForDebug(["node", "--inspect=9229", "script.js"], {
				env: {
					[HADYANCODE_BUILD_ENV_ENV]: "development",
					NODE_OPTIONS: "--enable-source-maps",
				},
			}),
		).toEqual(["node", "--inspect=9229", "script.js"]);
	});
});
