import {
	type HadyanCodeAccountBalance,
	type HadyanCodeAccountOrganization,
	type HadyanCodeAccountOrganizationBalance,
	HadyanCodeAccountService,
	type HadyanCodeAccountUser,
	type HadyanCodeSubscriptionPlan,
	formatProviderOAuthApiKey,
	getPersistedProviderApiKey,
	getProviderOAuthCredentialsFromSettings,
	getValidHadyanCodeCredentials,
	type ProviderSettings,
	ProviderSettingsManager,
	saveLocalProviderOAuthCredentials,
	type UserCurrentPlan,
} from "@hadyancode/core";
import { getHadyanCodeEnvironmentConfig } from "@hadyancode/shared";
import { formatCreditBalance, normalizeCreditBalance } from "../utils/output";
import { identifyTelemetryAccount } from "../utils/telemetry";
import type { Config } from "../utils/types";

export const HADYANCODE_CREDITS_DASHBOARD_URL =
	"https://app.cline.bot/dashboard/account?tab=credits";

type HadyanCodeAccountConfig = Pick<Config, "apiKey" | "logger" | "providerId">;

const HADYANCODE_PASS_PROVIDER_ID = "hadyancode-pass";

export interface HadyanCodeAccountSnapshot {
	user: HadyanCodeAccountUser;
	balance: HadyanCodeAccountBalance;
	organizationBalance: HadyanCodeAccountOrganizationBalance | null;
	organizations: HadyanCodeAccountOrganization[];
	activeOrganization: HadyanCodeAccountOrganization | null;
	displayedBalance: number;
}

export function formatHadyanCodeCredits(value: number): string {
	return formatCreditBalance(normalizeCreditBalance(value));
}

// FIXME: These message checks are temporary until structured error types are
// passed through to the CLI instead of plain error strings.
export function isHadyanCodeAccountAuthErrorMessage(message: string): boolean {
	const normalized = message.trim().toLowerCase();
	return (
		normalized === "no hadyancode account auth token found" ||
		normalized.includes("requires re-authentication")
	);
}

export function isHadyanCodeAccountCreditsErrorMessage(message: string): boolean {
	const normalized = message.trim().toLowerCase();
	// The HadyanCode API's 402 response carries `code: "insufficient_credits"` and
	// the message "Not enough credits available". Depending on how much of the
	// payload survives error extraction, the CLI may see the raw JSON blob or
	// just the human-readable message, so match both. The
	// "insufficient balance" pair is an older backend phrasing kept for safety.
	return (
		normalized.includes("insufficient_credits") ||
		normalized.includes("not enough credits") ||
		(normalized.includes("insufficient balance") &&
			normalized.includes("hadyancode credits balance"))
	);
}

function resolveAccountApiBaseUrl(input: {
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
}): string {
	const settingsBaseUrl = input.hadyancodeProviderSettings?.baseUrl?.trim();
	if (settingsBaseUrl) {
		return settingsBaseUrl;
	}
	const configuredBaseUrl = input.hadyancodeApiBaseUrl?.trim();
	if (configuredBaseUrl) {
		return configuredBaseUrl;
	}
	return getHadyanCodeEnvironmentConfig().apiBaseUrl;
}

function resolveHadyanCodeAccountAuthToken(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeProviderSettings?: ProviderSettings;
}): string | undefined {
	const configApiKey =
		input.config.providerId === "hadyancode" ? input.config.apiKey.trim() : "";
	return (
		getPersistedProviderApiKey("hadyancode", input.hadyancodeProviderSettings) ||
		configApiKey ||
		undefined
	);
}

async function resolveValidHadyanCodeAccountAuthToken(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeProviderSettings?: ProviderSettings;
	manager: ProviderSettingsManager;
	apiBaseUrl: string;
}): Promise<string | undefined> {
	const settings = input.hadyancodeProviderSettings;
	const credentials = settings
		? getProviderOAuthCredentialsFromSettings("hadyancode", settings)
		: null;
	if (settings && credentials) {
		const nextCredentials = await getValidHadyanCodeCredentials(credentials, {
			apiBaseUrl: input.apiBaseUrl,
		});
		if (!nextCredentials) {
			throw new Error(
				"HadyanCode account requires re-authentication. Run hadyancode auth hadyancode.",
			);
		}
		const nextAccessToken = formatProviderOAuthApiKey("hadyancode", nextCredentials);
		if (nextCredentials !== credentials) {
			saveLocalProviderOAuthCredentials(
				input.manager,
				"hadyancode",
				settings,
				nextCredentials,
				{ setLastUsed: false },
			);
		}
		return nextAccessToken;
	}
	return resolveHadyanCodeAccountAuthToken({
		config: input.config,
		hadyancodeProviderSettings: settings,
	});
}

export async function createHadyanCodeAccountService(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
	providerSettingsManager?: ProviderSettingsManager;
}): Promise<HadyanCodeAccountService | undefined> {
	const manager =
		input.providerSettingsManager ?? new ProviderSettingsManager();
	const settings =
		manager.getProviderSettings("hadyancode") ?? input.hadyancodeProviderSettings;
	const apiBaseUrl = resolveAccountApiBaseUrl({
		hadyancodeApiBaseUrl: input.hadyancodeApiBaseUrl,
		hadyancodeProviderSettings: settings,
	});
	const authToken = await resolveValidHadyanCodeAccountAuthToken({
		config: input.config,
		hadyancodeProviderSettings: settings,
		manager,
		apiBaseUrl,
	});
	if (!authToken) {
		return undefined;
	}
	return new HadyanCodeAccountService({
		apiBaseUrl,
		getAuthToken: async () => authToken,
	});
}

/**
 * Persist the active organization so headless runs and the hub daemon can
 * attach it to telemetry identity. Personal account clears stale org fields.
 */
function persistHadyanCodeOrganizationContext(
	activeOrganization: HadyanCodeAccountOrganization | null,
	userId: string,
): void {
	try {
		const manager = new ProviderSettingsManager();
		const persisted = manager.getProviderSettings("hadyancode");
		if (!persisted) {
			return;
		}
		manager.saveProviderSettings(
			{
				...persisted,
				auth: {
					...persisted.auth,
					accountId: persisted.auth?.accountId ?? userId,
					organizationId: activeOrganization?.organizationId,
					organizationName: activeOrganization?.name,
					memberId: activeOrganization?.memberId,
				},
			},
			{ setLastUsed: false },
		);
	} catch {
		// Best-effort only.
	}
}

export async function loadHadyanCodeAccountSnapshot(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
}): Promise<HadyanCodeAccountSnapshot> {
	const service = await createHadyanCodeAccountService(input);
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}

	const user = await service.fetchMe();
	const organizations = user.organizations ?? [];
	const activeOrganization =
		organizations.find((organization) => organization.active) ?? null;
	const [balance, organizationBalance] = await Promise.all([
		service.fetchBalance(user.id),
		activeOrganization
			? service.fetchOrganizationBalance(activeOrganization.organizationId)
			: Promise.resolve(null),
	]);
	const displayedBalance = activeOrganization
		? (organizationBalance?.balance ?? balance.balance)
		: balance.balance;
	const accountContext = {
		id: user.id,
		email: user.email,
		provider: "hadyancode",
		organizationId: activeOrganization?.organizationId,
		organizationName: activeOrganization?.name,
		memberId: activeOrganization?.memberId,
	};
	identifyTelemetryAccount(accountContext, input.config.logger);
	persistHadyanCodeOrganizationContext(activeOrganization, user.id);

	return {
		user,
		balance,
		organizationBalance,
		organizations,
		activeOrganization,
		displayedBalance,
	};
}

export async function switchHadyanCodeAccount(input: {
	config: HadyanCodeAccountConfig;
	organizationId?: string | null;
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
}): Promise<void> {
	const service = await createHadyanCodeAccountService(input);
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}
	await service.switchAccount(input.organizationId);
}

export async function loadIndividualSubscriptionPlans(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
}): Promise<HadyanCodeSubscriptionPlan[]> {
	const service = await createHadyanCodeAccountService(input);
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}
	return service.fetchAvailableSubscriptionPlans({ type: "individual" });
}

export async function loadCurrentUserPlan(input: {
	config: HadyanCodeAccountConfig;
	hadyancodeApiBaseUrl?: string;
	hadyancodeProviderSettings?: ProviderSettings;
}): Promise<UserCurrentPlan | undefined> {
	const service = await createHadyanCodeAccountService(input);
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}
	return service.fetchCurrentUserPlan();
}

export async function loadCurrentUserPlanFromProviderSettings(input: {
	providerSettingsManager: ProviderSettingsManager;
	hadyancodeApiBaseUrl?: string;
}): Promise<UserCurrentPlan | undefined> {
	const service = await createHadyanCodeAccountService({
		config: { apiKey: "", logger: undefined, providerId: "hadyancode" },
		hadyancodeApiBaseUrl: input.hadyancodeApiBaseUrl,
		providerSettingsManager: input.providerSettingsManager,
	});
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}
	return service.fetchCurrentUserPlan();
}

export async function loadIndividualSubscriptionPlansFromProviderSettings(input: {
	providerSettingsManager: ProviderSettingsManager;
	hadyancodeApiBaseUrl?: string;
}): Promise<HadyanCodeSubscriptionPlan[]> {
	const service = await createHadyanCodeAccountService({
		config: { apiKey: "", logger: undefined, providerId: "hadyancode" },
		hadyancodeApiBaseUrl: input.hadyancodeApiBaseUrl,
		providerSettingsManager: input.providerSettingsManager,
	});
	if (!service) {
		throw new Error("No HadyanCode account auth token found");
	}
	return service.fetchAvailableSubscriptionPlans({ type: "individual" });
}

async function onChangeToHadyanCodePass(config: HadyanCodeAccountConfig) {
	try {
		await switchHadyanCodeAccount({
			config: config,
			organizationId: null,
		});
	} catch (error) {
		config.logger?.debug("Failed to switch HadyanCodePass to personal account", {
			error,
		});
	}
}

export async function onProviderChange(input: {
	config: HadyanCodeAccountConfig;
	providerId: string;
}): Promise<void> {
	if (input.providerId === HADYANCODE_PASS_PROVIDER_ID) {
		return onChangeToHadyanCodePass(input.config);
	}

	return;
}
