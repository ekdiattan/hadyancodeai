import { isHadyanCodeAccountNotAuthenticatedResult } from "@/lib/hadyancode-account-state";
import type {
	HadyanCodeGitHubRepository,
	HadyanCodeIntegration,
} from "@/lib/hadyancode-integrations-types";
import { desktopClient } from "@/lib/desktop-client";

export * from "@/lib/hadyancode-integrations-types";

export type HadyanCodeIntegrationsListResult =
	| { status: "ok"; integrations: HadyanCodeIntegration[] }
	| { status: "not-authenticated" };

export async function listHadyanCodeIntegrations(): Promise<HadyanCodeIntegrationsListResult> {
	const result = await desktopClient.invoke("hadyancode_integrations", {
		operation: "list",
	});
	if (isHadyanCodeAccountNotAuthenticatedResult(result)) {
		return { status: "not-authenticated" };
	}
	return {
		status: "ok",
		integrations: Array.isArray(result) ? (result as HadyanCodeIntegration[]) : [],
	};
}

export async function listHadyanCodeGitHubRepositories(): Promise<
	HadyanCodeGitHubRepository[]
> {
	const result = await desktopClient.invoke("hadyancode_integrations", {
		operation: "listGitHubRepositories",
	});
	return Array.isArray(result) ? (result as HadyanCodeGitHubRepository[]) : [];
}

export async function fetchGitHubInstallUrl(): Promise<string> {
	const result = await desktopClient.invoke("hadyancode_integrations", {
		operation: "githubInstallUrl",
	});
	if (isHadyanCodeAccountNotAuthenticatedResult(result)) {
		throw new Error("sign in to your HadyanCode account first");
	}
	const url = (result as { url?: unknown } | null)?.url;
	if (typeof url !== "string" || !url.trim()) {
		throw new Error("no GitHub install URL was returned");
	}
	return url;
}
