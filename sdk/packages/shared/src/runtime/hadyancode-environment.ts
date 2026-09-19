export const HADYANCODE_ENVIRONMENT_ENV = "HADYANCODE_ENVIRONMENT";
export const HADYANCODE_ENVIRONMENT_OVERRIDE_ENV = "HADYANCODE_ENVIRONMENT_OVERRIDE";

export type HadyanCodeEnvironment = "production" | "staging" | "local";

export interface HadyanCodeEnvironmentConfig {
	readonly environment: HadyanCodeEnvironment;
	readonly appBaseUrl: string;
	readonly apiBaseUrl: string;
	readonly mcpBaseUrl: string;
	readonly workOsClientId: string;
}

export const HADYANCODE_ENVIRONMENTS: Readonly<
	Record<HadyanCodeEnvironment, HadyanCodeEnvironmentConfig>
> = {
	production: {
		environment: "production",
		appBaseUrl: "https://app.cline.bot",
		apiBaseUrl: "https://api.cline.bot",
		mcpBaseUrl: "https://api.cline.bot/v1/mcp",
		workOsClientId: "client_01K3A541FN8TA3EPPHTD2325AR",
	},
	staging: {
		environment: "staging",
		appBaseUrl: "https://staging-app.cline.bot",
		apiBaseUrl: "https://core-api.staging.int.cline.bot",
		mcpBaseUrl: "https://core-api.staging.int.cline.bot/v1/mcp",
		workOsClientId: "client_01K3A5415VF6QBQBG3XYCW91G6",
	},
	local: {
		environment: "local",
		appBaseUrl: "http://localhost:3000",
		apiBaseUrl: "http://localhost:7777",
		mcpBaseUrl: "http://localhost:7777/v1/mcp",
		workOsClientId: "client_01K6XQAY7JK6T5HXVSZW2S5VYK",
	},
};

export const DEFAULT_HADYANCODE_ENVIRONMENT: HadyanCodeEnvironment = "production";

export interface ResolveHadyanCodeEnvironmentOptions {
	env?: Partial<NodeJS.ProcessEnv>;
}

function normalizeHadyanCodeEnvironment(
	value: string | undefined,
): HadyanCodeEnvironment | undefined {
	const normalized = value?.trim().toLowerCase();
	if (
		normalized === "production" ||
		normalized === "staging" ||
		normalized === "local"
	) {
		return normalized;
	}
	return undefined;
}

function readProcessEnv(): NodeJS.ProcessEnv {
	// `process` may be absent in browser-style runtimes (this module ships
	// from the browser entry of `@hadyancode/shared`). Treat its absence as "no
	// env vars set" so callers always get a deterministic default.
	if (typeof process === "undefined" || !process?.env) {
		return {};
	}
	return process.env;
}

export function resolveHadyanCodeEnvironment(): HadyanCodeEnvironment {
	const env = readProcessEnv();
	return (
		normalizeHadyanCodeEnvironment(env[HADYANCODE_ENVIRONMENT_OVERRIDE_ENV]) ??
		normalizeHadyanCodeEnvironment(env[HADYANCODE_ENVIRONMENT_ENV]) ??
		DEFAULT_HADYANCODE_ENVIRONMENT
	);
}

function getEnvConfig(env?: HadyanCodeEnvironment) {
	if (typeof env === "string") {
		return HADYANCODE_ENVIRONMENTS[env];
	}
	return HADYANCODE_ENVIRONMENTS[resolveHadyanCodeEnvironment()];
}

function applyConfigOverrides(
	config: HadyanCodeEnvironmentConfig,
	env: NodeJS.ProcessEnv,
): HadyanCodeEnvironmentConfig {
	if (env.HADYANCODE_API_BASE_URL) {
		config = {
			...config,
			apiBaseUrl: env.HADYANCODE_API_BASE_URL,
			mcpBaseUrl: `${env.HADYANCODE_API_BASE_URL}/v1/mcp`,
		};
	}

	return config;
}

export function getHadyanCodeEnvironmentConfig(
	env?: HadyanCodeEnvironment,
): HadyanCodeEnvironmentConfig {
	const config = getEnvConfig(env);

	return applyConfigOverrides(config, readProcessEnv());
}
