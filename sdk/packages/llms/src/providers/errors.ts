import { getHadyanCodeEnvironmentConfig } from "@hadyancode/shared";

export const HADYANCODE_NOT_SUBSCRIBED_RESPONSE_MESSAGE =
	"the user is not subscribed to required model plan";
const HADYANCODE_NOT_SUBSCRIBED_FORMATTED_MESSAGE_PREFIX =
	"no access to hadyancodepass subscription models yet. subscribe to hadyancodepass";
export const HADYANCODE_ORG_INDIVIDUAL_INFERENCE_SUBSCRIPTION_RESPONSE_MESSAGE =
	"organization accounts cannot use individual model inference subscriptions";

const HADYANCODE_PASS_LIMIT_PREFIX = "you have reached your";
const HADYANCODE_PASS_LIMIT_MARKER = "hadyancodepass limit";
const HADYANCODE_PASS_LIMIT_SUFFIX = "please try again later.";
const HADYANCODE_FREE_MODEL_LIMIT_MARKER = "free limit reached on model";
const HADYANCODE_FREE_MODEL_LIMIT_RETRY_MARKER = "try again in ";
const HADYANCODE_MODEL_NOT_FOUND_MARKER = "model not found";

function findHadyanCodePassLimitMessageBounds(
	text: string,
): { start: number; end: number } | undefined {
	const normalized = text.toLowerCase();
	const start = normalized.indexOf(HADYANCODE_PASS_LIMIT_PREFIX);
	if (start === -1) {
		return undefined;
	}

	const suffixStart = normalized.indexOf(HADYANCODE_PASS_LIMIT_SUFFIX, start);
	if (suffixStart === -1) {
		return undefined;
	}

	const end = suffixStart + HADYANCODE_PASS_LIMIT_SUFFIX.length;
	if (!normalized.slice(start, end).includes(HADYANCODE_PASS_LIMIT_MARKER)) {
		return undefined;
	}

	return { start, end };
}

export function getHadyanCodePassSubscriptionUrl(): string {
	return `${new URL(
		"/dashboard/subscription?personal=true",
		getHadyanCodeEnvironmentConfig().appBaseUrl,
	).toString()}`;
}

export function getHadyanCodeNotSubscribedMessage(): string {
	return `No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan: ${getHadyanCodePassSubscriptionUrl()}`;
}

export class HadyanCodeNotSubscribedError extends Error {
	public readonly providerId?: string;

	constructor(providerId?: string) {
		super(getHadyanCodeNotSubscribedMessage());
		this.name = "HadyanCodeNotSubscribedError";
		this.providerId = providerId;
	}
}

export function getHadyanCodeOrgIndividualInferenceSubscriptionMessage(): string {
	return "Organization accounts cannot use HadyanCodePass subscriptions. Go to /account -> change account to switch to your personal account for HadyanCodePass";
}

export class HadyanCodeOrgIndividualInferenceSubscriptionError extends Error {
	public readonly providerId?: string;

	constructor(providerId?: string) {
		super(getHadyanCodeOrgIndividualInferenceSubscriptionMessage());
		this.name = "HadyanCodeOrgIndividualInferenceSubscriptionError";
		this.providerId = providerId;
	}
}

export class HadyanCodePassLimitError extends Error {
	public readonly providerId?: string;

	constructor(message: string, providerId?: string) {
		super(message);
		this.name = "HadyanCodePassLimitError";
		this.providerId = providerId;
	}
}

export class HadyanCodeFreeModelLimitError extends Error {
	public readonly providerId?: string;

	constructor(message: string, providerId?: string) {
		super(message);
		this.name = "HadyanCodeFreeModelLimitError";
		this.providerId = providerId;
	}
}

export function isHadyanCodeNotSubscribedError(
	error: unknown,
): error is HadyanCodeNotSubscribedError {
	return error instanceof HadyanCodeNotSubscribedError;
}

export function isHadyanCodeOrgIndividualInferenceSubscriptionError(
	error: unknown,
): error is HadyanCodeOrgIndividualInferenceSubscriptionError {
	return error instanceof HadyanCodeOrgIndividualInferenceSubscriptionError;
}

export function isHadyanCodePassLimitError(
	error: unknown,
): error is HadyanCodePassLimitError {
	return error instanceof HadyanCodePassLimitError;
}

export function isHadyanCodeFreeModelLimitError(
	error: unknown,
): error is HadyanCodeFreeModelLimitError {
	return error instanceof HadyanCodeFreeModelLimitError;
}

export function isHadyanCodeNotSubscribedMessage(text: string): boolean {
	const normalized = text.trim().toLowerCase();
	return (
		normalized.includes(HADYANCODE_NOT_SUBSCRIBED_RESPONSE_MESSAGE) ||
		normalized.includes(HADYANCODE_NOT_SUBSCRIBED_FORMATTED_MESSAGE_PREFIX)
	);
}

export function isHadyanCodeOrgIndividualInferenceSubscriptionMessage(
	text: string,
): boolean {
	return text
		.toLowerCase()
		.includes(HADYANCODE_ORG_INDIVIDUAL_INFERENCE_SUBSCRIPTION_RESPONSE_MESSAGE);
}

export function isHadyanCodePassLimitMessage(text: string): boolean {
	return findHadyanCodePassLimitMessageBounds(text) !== undefined;
}

export function extractHadyanCodePassLimitMessage(text: string): string | undefined {
	const bounds = findHadyanCodePassLimitMessageBounds(text);
	return bounds ? text.slice(bounds.start, bounds.end) : undefined;
}

export function isHadyanCodeFreeModelLimitMessage(text: string): boolean {
	return text.toLowerCase().includes(HADYANCODE_FREE_MODEL_LIMIT_MARKER);
}

export function isHadyanCodeModelNotFoundMessage(text: string): boolean {
	return text.toLowerCase().includes(HADYANCODE_MODEL_NOT_FOUND_MARKER);
}

export function extractHadyanCodeFreeModelLimitResetTime(
	text: string,
): string | undefined {
	const message = text.toLowerCase();
	const resetStart = message.indexOf(HADYANCODE_FREE_MODEL_LIMIT_RETRY_MARKER);
	if (resetStart === -1) {
		return undefined;
	}

	const resetTime = message
		.slice(resetStart + HADYANCODE_FREE_MODEL_LIMIT_RETRY_MARKER.length)
		.trim();
	return resetTime || undefined;
}
