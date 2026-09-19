import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	HADYANCODE_ENVIRONMENT_ENV,
	HADYANCODE_ENVIRONMENT_OVERRIDE_ENV,
	HADYANCODE_ENVIRONMENTS,
	DEFAULT_HADYANCODE_ENVIRONMENT,
	getHadyanCodeEnvironmentConfig,
	resolveHadyanCodeEnvironment,
} from "./hadyancode-environment";

const ENV_KEYS = [
	HADYANCODE_ENVIRONMENT_ENV,
	HADYANCODE_ENVIRONMENT_OVERRIDE_ENV,
	"HADYANCODE_API_BASE_URL",
] as const;

const originalEnvValues = Object.fromEntries(
	ENV_KEYS.map((key) => [key, process.env[key]]),
);

beforeEach(() => {
	vi.unstubAllGlobals();
	for (const key of ENV_KEYS) {
		delete process.env[key];
	}
});

afterEach(() => {
	vi.unstubAllGlobals();
	for (const key of ENV_KEYS) {
		const value = originalEnvValues[key];
		if (typeof value === "string") {
			process.env[key] = value;
		} else {
			delete process.env[key];
		}
	}
});

describe("resolveHadyanCodeEnvironment", () => {
	it("defaults to production when no env var is set", () => {
		expect(resolveHadyanCodeEnvironment()).toBe(DEFAULT_HADYANCODE_ENVIRONMENT);
	});

	it("reads HADYANCODE_ENVIRONMENT from process.env", () => {
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "staging";
		expect(resolveHadyanCodeEnvironment()).toBe("staging");

		process.env[HADYANCODE_ENVIRONMENT_ENV] = "local";
		expect(resolveHadyanCodeEnvironment()).toBe("local");
	});

	it("prefers HADYANCODE_ENVIRONMENT_OVERRIDE over HADYANCODE_ENVIRONMENT", () => {
		process.env[HADYANCODE_ENVIRONMENT_OVERRIDE_ENV] = "local";
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "staging";

		expect(resolveHadyanCodeEnvironment()).toBe("local");
	});

	it("normalizes case and surrounding whitespace", () => {
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "  STAGING  ";

		expect(resolveHadyanCodeEnvironment()).toBe("staging");
	});

	it("ignores unknown values and falls through to the next source", () => {
		process.env[HADYANCODE_ENVIRONMENT_OVERRIDE_ENV] = "qa";
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "staging";
		expect(resolveHadyanCodeEnvironment()).toBe("staging");

		delete process.env[HADYANCODE_ENVIRONMENT_OVERRIDE_ENV];
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "qa";
		expect(resolveHadyanCodeEnvironment()).toBe(DEFAULT_HADYANCODE_ENVIRONMENT);
	});

	it("defaults to production when process is unavailable", () => {
		vi.stubGlobal("process", undefined);

		expect(resolveHadyanCodeEnvironment()).toBe(DEFAULT_HADYANCODE_ENVIRONMENT);
	});
});

describe("getHadyanCodeEnvironmentConfig", () => {
	it("returns the config for an explicit environment", () => {
		expect(getHadyanCodeEnvironmentConfig("staging")).toBe(
			HADYANCODE_ENVIRONMENTS.staging,
		);
		expect(getHadyanCodeEnvironmentConfig("local")).toBe(HADYANCODE_ENVIRONMENTS.local);
		expect(getHadyanCodeEnvironmentConfig("production")).toBe(
			HADYANCODE_ENVIRONMENTS.production,
		);
	});

	it("falls back to production by default", () => {
		expect(getHadyanCodeEnvironmentConfig()).toBe(HADYANCODE_ENVIRONMENTS.production);
	});

	it("uses the resolved process.env environment when no explicit environment is provided", () => {
		process.env[HADYANCODE_ENVIRONMENT_ENV] = "staging";

		expect(getHadyanCodeEnvironmentConfig()).toBe(HADYANCODE_ENVIRONMENTS.staging);
	});

	it("applies HADYANCODE_API_BASE_URL without mutating the catalog config", () => {
		process.env.HADYANCODE_API_BASE_URL = "http://127.0.0.1:3000";

		expect(getHadyanCodeEnvironmentConfig("local")).toEqual({
			...HADYANCODE_ENVIRONMENTS.local,
			apiBaseUrl: "http://127.0.0.1:3000",
			mcpBaseUrl: "http://127.0.0.1:3000/v1/mcp",
		});
		expect(HADYANCODE_ENVIRONMENTS.local.apiBaseUrl).toBe("http://localhost:7777");
	});

	it("defaults to production when process is unavailable", () => {
		vi.stubGlobal("process", undefined);

		expect(getHadyanCodeEnvironmentConfig()).toBe(HADYANCODE_ENVIRONMENTS.production);
	});
});

describe("HADYANCODE_ENVIRONMENTS catalog", () => {
	it("exposes an environment field that matches its key", () => {
		for (const [key, config] of Object.entries(HADYANCODE_ENVIRONMENTS)) {
			expect(config.environment).toBe(key);
		}
	});

	it("populates appBaseUrl, apiBaseUrl, and mcpBaseUrl for every environment", () => {
		for (const config of Object.values(HADYANCODE_ENVIRONMENTS)) {
			expect(config.appBaseUrl).toMatch(/^https?:\/\//);
			expect(config.apiBaseUrl).toMatch(/^https?:\/\//);
			expect(config.mcpBaseUrl).toMatch(/^https?:\/\//);
		}
	});
});
