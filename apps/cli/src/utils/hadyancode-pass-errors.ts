import {
	type HadyanCodeSubscriptionPlan,
	extractHadyanCodeFreeModelLimitResetTime,
	extractHadyanCodePassLimitMessage,
	getHadyanCodeOrgIndividualInferenceSubscriptionMessage,
	isHadyanCodeFreeModelLimitError,
	isHadyanCodeFreeModelLimitMessage,
	isHadyanCodeModelNotFoundMessage,
	isHadyanCodeNotSubscribedError,
	isHadyanCodeNotSubscribedMessage,
	isHadyanCodeOrgIndividualInferenceSubscriptionError,
	isHadyanCodeOrgIndividualInferenceSubscriptionMessage,
	isHadyanCodePassLimitError,
	isHadyanCodePassLimitMessage,
} from "@hadyancode/core";

import { getHadyanCodeEnvironmentConfig } from "@hadyancode/shared";

export { getHadyanCodeOrgIndividualInferenceSubscriptionMessage };

export function getCliSubscriptionUrl(): string {
	return new URL(
		`/dashboard/subscription?personal=true`,
		getHadyanCodeEnvironmentConfig().appBaseUrl,
	).toString();
}

export function getCliNotSubscribedMessage(): string {
	return `No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan: ${getCliSubscriptionUrl()}`;
}

export function getCliHadyanCodePassLimitMessage(message: string): string {
	const detail = getHadyanCodePassLimitDetailMessage(message) ?? message.trim();
	const lines = [
		"HadyanCodePass limit reached",
		detail,
		"Switch to HadyanCode usage-based billing and retry with the HadyanCode provider.",
		"Interactive CLI: open the model selector with /model, choose HadyanCode, then retry.",
		"Headless CLI: rerun with --provider hadyancode.",
	];
	return lines.filter((line) => line.trim().length > 0).join("\n");
}

const HADYANCODE_FREE_MODEL_PREFIX = "hadyancode-free/";
const HADYANCODE_FREE_PROMOTION_ENDED_HEADER = "Free model promotion ended";
const HADYANCODE_FREE_MODEL_LIMIT_HEADER = "Daily free model limit reached";

export function getCliHadyanCodeFreePromotionEndedMessage(): string {
	return [
		HADYANCODE_FREE_PROMOTION_ENDED_HEADER,
		"The free promotion for this model has ended and it is no longer available.",
		"Select another model to continue.",
		"Open the model selector with /model.",
	].join("\n");
}

export function getCliHadyanCodeFreeModelLimitMessage(message: string): string {
	const resetTime = extractHadyanCodeFreeModelLimitResetTime(message);
	return [
		HADYANCODE_FREE_MODEL_LIMIT_HEADER,
		"You've reached today's free usage limit for this model.",
		resetTime
			? `Try again in ${resetTime} or select another model.`
			: "Try again later or select another model.",
		"Open the model selector with /model.",
	].join("\n");
}

export function getIndividualPlanFeatures(
	plans: HadyanCodeSubscriptionPlan[],
): string[] {
	const planWithFeatures = plans.find((plan) => plan.interval === "Monthly");

	return planWithFeatures?.features?.included ?? [];
}

function isFormattedHadyanCodePassSubscriptionMessage(message: string): boolean {
	const normalized = message.trim().toLowerCase();
	return (
		normalized.includes("no access to hadyancodepass subscription models yet") &&
		normalized.includes("subscribe to hadyancodepass")
	);
}

export function isHadyanCodePassSubscriptionError(error: unknown): boolean {
	if (isHadyanCodeNotSubscribedError(error)) {
		return true;
	}
	if (error instanceof Error) {
		return (
			error.name === "HadyanCodeNotSubscribedError" ||
			isHadyanCodeNotSubscribedMessage(error.message) ||
			isFormattedHadyanCodePassSubscriptionMessage(error.message)
		);
	}
	return (
		typeof error === "string" &&
		(isHadyanCodeNotSubscribedMessage(error) ||
			isFormattedHadyanCodePassSubscriptionMessage(error))
	);
}

export function isHadyanCodeOrgIndividualInferenceSubscriptionErrorMessage(
	error: unknown,
): boolean {
	if (isHadyanCodeOrgIndividualInferenceSubscriptionError(error)) {
		return true;
	}
	if (error instanceof Error) {
		return (
			error.name === "HadyanCodeOrgIndividualInferenceSubscriptionError" ||
			isHadyanCodeOrgIndividualInferenceSubscriptionMessage(error.message) ||
			error.message === getHadyanCodeOrgIndividualInferenceSubscriptionMessage()
		);
	}
	return (
		typeof error === "string" &&
		(isHadyanCodeOrgIndividualInferenceSubscriptionMessage(error) ||
			error === getHadyanCodeOrgIndividualInferenceSubscriptionMessage())
	);
}

export function getHadyanCodePassLimitDetailMessage(
	error: unknown,
): string | undefined {
	return extractHadyanCodePassLimitMessage(
		error instanceof Error ? error.message : String(error),
	);
}

export function isHadyanCodePassLimitErrorMessage(error: unknown): boolean {
	if (isHadyanCodePassLimitError(error)) {
		return true;
	}
	if (error instanceof Error) {
		return (
			error.name === "HadyanCodePassLimitError" ||
			isHadyanCodePassLimitMessage(error.message)
		);
	}
	return typeof error === "string" && isHadyanCodePassLimitMessage(error);
}

// Detects that a deleted free model was requested: the backend answers "model
// not found" once a free promotion ends and the hadyancode-free/ model is removed.
// The modelId gate keeps regular model-not-found errors on their generic path.
export function isHadyanCodeFreePromotionEndedErrorMessage(
	error: unknown,
	modelId?: string,
): boolean {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	if (
		message
			.toLowerCase()
			.includes(HADYANCODE_FREE_PROMOTION_ENDED_HEADER.toLowerCase())
	) {
		return true;
	}
	if (!modelId?.startsWith(HADYANCODE_FREE_MODEL_PREFIX)) {
		return false;
	}
	return isHadyanCodeModelNotFoundMessage(message);
}

export function isHadyanCodeFreeModelLimitErrorMessage(error: unknown): boolean {
	if (isHadyanCodeFreeModelLimitError(error)) {
		return true;
	}
	if (error instanceof Error) {
		return (
			error.name === "HadyanCodeFreeModelLimitError" ||
			isHadyanCodeFreeModelLimitMessage(error.message)
		);
	}
	return (
		typeof error === "string" &&
		(error
			.toLowerCase()
			.includes(HADYANCODE_FREE_MODEL_LIMIT_HEADER.toLowerCase()) ||
			isHadyanCodeFreeModelLimitMessage(error))
	);
}

export function formatCliErrorMessage(
	error: unknown,
	options?: { modelId?: string },
): string {
	if (isHadyanCodePassSubscriptionError(error)) {
		return getCliNotSubscribedMessage();
	}
	if (isHadyanCodeOrgIndividualInferenceSubscriptionErrorMessage(error)) {
		return getHadyanCodeOrgIndividualInferenceSubscriptionMessage();
	}
	if (isHadyanCodePassLimitErrorMessage(error)) {
		return getCliHadyanCodePassLimitMessage(
			error instanceof Error ? error.message : String(error),
		);
	}
	if (isHadyanCodeFreeModelLimitErrorMessage(error)) {
		return getCliHadyanCodeFreeModelLimitMessage(
			error instanceof Error ? error.message : String(error),
		);
	}
	if (isHadyanCodeFreePromotionEndedErrorMessage(error, options?.modelId)) {
		return getCliHadyanCodeFreePromotionEndedMessage();
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
