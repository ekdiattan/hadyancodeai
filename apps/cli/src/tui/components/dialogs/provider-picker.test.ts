import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProviderSettingsManager } from "@hadyancode/core";
import { afterEach, describe, expect, it } from "vitest";
import {
	getPersistedProviderApiKey,
	isProviderConfigured,
} from "../../../utils/provider-auth";
import {
	buildHadyanCodePassSubscriptionPageUrl,
	resolveOAuthWaitKeyAction,
	saveManualProviderApiKey,
} from "./provider-picker-helpers";

describe("resolveOAuthWaitKeyAction", () => {
	it("switches to manual API key entry on K when the fallback is available", () => {
		expect(resolveOAuthWaitKeyAction({ name: "k" }, true)).toBe("use_api_key");
	});

	it("cancels on K when the fallback is not available", () => {
		expect(resolveOAuthWaitKeyAction({ name: "k" }, false)).toBe("cancel");
	});

	it("cancels on any other unmodified key so users are never stuck waiting on a browser flow", () => {
		for (const name of ["escape", "q", "return", "space", "up", "x"]) {
			expect(resolveOAuthWaitKeyAction({ name }, true)).toBe("cancel");
			expect(resolveOAuthWaitKeyAction({ name }, false)).toBe("cancel");
		}
	});

	it("ignores modifier-held keys so holding Cmd/Ctrl to click the auth link never cancels", () => {
		expect(resolveOAuthWaitKeyAction({ name: "k", ctrl: true }, true)).toBe(
			"ignore",
		);
		expect(resolveOAuthWaitKeyAction({ name: "c", ctrl: true }, false)).toBe(
			"ignore",
		);
		expect(resolveOAuthWaitKeyAction({ name: "x", meta: true }, true)).toBe(
			"ignore",
		);
		expect(resolveOAuthWaitKeyAction({ name: "x", super: true }, false)).toBe(
			"ignore",
		);
		// A bare modifier press (empty name) is ignored, not a cancel.
		expect(resolveOAuthWaitKeyAction({ name: "" }, true)).toBe("ignore");
	});
});

describe("buildHadyanCodePassSubscriptionPageUrl", () => {
	it("opens the personal subscription page on production by default", () => {
		expect(
			buildHadyanCodePassSubscriptionPageUrl(undefined).startsWith(
				"https://app.cline.bot/dashboard/subscription?personal=true",
			),
		).toBe(true);
	});

	it("keeps the configured app base URL", () => {
		expect(
			buildHadyanCodePassSubscriptionPageUrl(
				"https://staging-app.cline.bot",
			).startsWith(
				"https://staging-app.cline.bot/dashboard/subscription?personal=true",
			),
		).toBe(true);
	});
});

describe("saveManualProviderApiKey", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { force: true, recursive: true });
		}
	});

	function createManager(): ProviderSettingsManager {
		const dir = mkdtempSync(join(tmpdir(), "hadyancode-cli-provider-picker-"));
		tempDirs.push(dir);
		return new ProviderSettingsManager({
			filePath: join(dir, "providers.json"),
		});
	}

	it("clears stored OAuth tokens so the manual key takes effect", () => {
		const manager = createManager();
		manager.saveProviderSettings({
			provider: "hadyancode",
			auth: {
				accessToken: "stale-access-token",
				refreshToken: "stale-refresh-token",
				accountId: "acct_123",
			},
		});

		saveManualProviderApiKey(manager, "hadyancode", "manual-api-key");

		const settings = manager.getProviderSettings("hadyancode");
		expect(settings?.apiKey).toBe("manual-api-key");
		expect(settings?.auth?.accessToken).toBeUndefined();
		expect(settings?.auth?.refreshToken).toBeUndefined();
		expect(settings?.auth?.accountId).toBe("acct_123");
		expect(getPersistedProviderApiKey("hadyancode", settings)).toBe(
			"manual-api-key",
		);
		expect(isProviderConfigured("hadyancode", settings)).toBe(true);
	});

	it("saves hadyancode-pass keys to the shared hadyancode auth storage entry", () => {
		const manager = createManager();
		manager.saveProviderSettings({
			provider: "hadyancode",
			auth: {
				accessToken: "stale-access-token",
				refreshToken: "stale-refresh-token",
			},
		});

		saveManualProviderApiKey(manager, "hadyancode-pass", "manual-api-key");

		// hadyancode-pass inherits auth storage from the "hadyancode" entry, so the key
		// must land there and the stale tokens must be gone for both providers.
		const hadyancodeSettings = manager.getProviderSettings("hadyancode");
		expect(hadyancodeSettings?.apiKey).toBe("manual-api-key");
		expect(hadyancodeSettings?.auth?.accessToken).toBeUndefined();

		const hadyancodePassSettings = manager.getProviderSettings("hadyancode-pass");
		expect(getPersistedProviderApiKey("hadyancode-pass", hadyancodePassSettings)).toBe(
			"manual-api-key",
		);
		expect(isProviderConfigured("hadyancode-pass", hadyancodePassSettings)).toBe(true);
	});

	it("clears stale credentials copied into a direct hadyancode-pass entry", () => {
		const manager = createManager();
		manager.saveProviderSettings({
			provider: "hadyancode",
			auth: {
				accessToken: "stale-access-token",
				refreshToken: "stale-refresh-token",
			},
		});
		// Provider switching copies the merged settings (including auth) into
		// a direct hadyancode-pass entry, which shadows the shared "hadyancode" entry.
		manager.saveProviderSettings({
			provider: "hadyancode-pass",
			apiKey: "stale-copied-key",
			auth: {
				accessToken: "stale-access-token",
				refreshToken: "stale-refresh-token",
			},
		});

		saveManualProviderApiKey(manager, "hadyancode-pass", "manual-api-key");

		const hadyancodePassSettings = manager.getProviderSettings("hadyancode-pass");
		expect(hadyancodePassSettings?.auth?.accessToken).toBeUndefined();
		expect(getPersistedProviderApiKey("hadyancode-pass", hadyancodePassSettings)).toBe(
			"manual-api-key",
		);
	});
});
