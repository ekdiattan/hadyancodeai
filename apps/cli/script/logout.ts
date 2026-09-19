#!/usr/bin/env bun

/**
 * Sign out of the first-party HadyanCode account.
 *
 * Mirrors what the hosts do on "Sign out":
 * - VS Code: `handleDeauth()` → `clearHadyanCodeCredentials()`
 *   (`apps/vscode/src/sdk/auth-service.ts`) drops the OAuth `auth` block.
 * - Hub/desktop: `save_provider_settings` with an empty `api_key` and empty
 *   auth tokens (`account-view.tsx`).
 *
 * Both end up writing `<data-dir>/data/settings/providers.json`, which is the
 * only credential store the runtime reads today (legacy secrets are migrated
 * into it). This script clears the OAuth tokens *and* the API key for the
 * first-party providers, and leaves every other provider untouched.
 *
 * Usage:
 *   bun apps/cli/script/logout.ts --dry-run          # show what would change
 *   bun apps/cli/script/logout.ts                    # default data dir
 *   HADYANCODE_DIR=/tmp/hadyancode-check bun apps/cli/script/logout.ts
 *   bun apps/cli/script/logout.ts --provider hadyancode-pass
 */

import { ProviderSettingsManager } from "@hadyancode/core";
import { resolveHadyanCodeDataDir } from "@hadyancode/shared/storage";

/**
 * Both first-party providers are cleared.
 *
 * `hadyancode-pass` normally resolves credentials through the `hadyancode` auth
 * handler (`storageProviderId: "hadyancode"` in `provider-auth-registry.ts`), so
 * clearing `hadyancode` already signs the tier out. A legacy or out-of-band write
 * can still leave an `auth` block on the pass entry, and a per-provider entry
 * wins over the borrowed one, so both are cleared to be safe.
 */
const FIRST_PARTY_PROVIDER_IDS = ["hadyancode", "hadyancode-pass"] as const;

interface ParsedArgs {
	dryRun: boolean;
	providers: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
	const providers: string[] = [];
	let dryRun = false;
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (arg === "--provider") {
			const value = argv[index + 1]?.trim();
			if (value) {
				providers.push(value);
			}
			index += 1;
			continue;
		}
		if (arg === "--help" || arg === "-h") {
			console.log(
				"Usage: bun apps/cli/script/logout.ts [--dry-run] [--provider <id>]...",
			);
			process.exit(0);
		}
		console.error(`Unknown option: ${arg}`);
		process.exit(2);
	}
	return {
		dryRun,
		providers: providers.length > 0 ? providers : [...FIRST_PARTY_PROVIDER_IDS],
	};
}

const { dryRun, providers } = parseArgs(process.argv.slice(2));
const manager = new ProviderSettingsManager();

console.log(`Data dir: ${resolveHadyanCodeDataDir()}`);
console.log(`Mode:     ${dryRun ? "dry run (nothing is written)" : "write"}`);

// Snapshot every provider before writing anything: hadyancode-pass borrows
// hadyancode's credentials, so clearing one would otherwise change what the
// next read reports and make the dry-run output differ from the real run.
const snapshots = providers.map((providerId) => {
	const existing = manager.getProviderSettings(providerId);
	return {
		providerId,
		existing,
		hadTokens: Boolean(
			existing?.auth?.accessToken || existing?.auth?.refreshToken,
		),
		hadApiKey: Boolean(existing?.apiKey?.trim()),
	};
});

let signedOut = 0;
for (const { providerId, existing, hadTokens, hadApiKey } of snapshots) {
	if (!hadTokens && !hadApiKey) {
		console.log(`- ${providerId}: no stored credentials, nothing to do`);
		continue;
	}

	console.log(
		`- ${providerId}: tokens=${hadTokens ? "present" : "none"} apiKey=${
			hadApiKey ? "present" : "none"
		}`,
	);

	if (dryRun) {
		continue;
	}

	manager.saveProviderSettings(
		{
			...existing,
			provider: providerId,
			auth: undefined,
			apiKey: "",
		},
		{ tokenSource: "manual", setLastUsed: false },
	);
	signedOut += 1;
}

if (dryRun) {
	console.log("Dry run complete. Re-run without --dry-run to sign out.");
	process.exit(0);
}

console.log(
	signedOut > 0
		? `Signed out of ${signedOut} provider(s).`
		: "Already signed out.",
);
