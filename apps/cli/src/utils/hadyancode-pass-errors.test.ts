import { describe, expect, it } from "vitest";
import {
	formatCliErrorMessage,
	getCliHadyanCodeFreeModelLimitMessage,
	getCliHadyanCodePassLimitMessage,
	getCliNotSubscribedMessage,
	getHadyanCodeOrgIndividualInferenceSubscriptionMessage,
	getHadyanCodePassLimitDetailMessage,
	isHadyanCodeFreeModelLimitErrorMessage,
	isHadyanCodeFreePromotionEndedErrorMessage,
	isHadyanCodeOrgIndividualInferenceSubscriptionErrorMessage,
	isHadyanCodePassLimitErrorMessage,
	isHadyanCodePassSubscriptionError,
} from "./hadyancode-pass-errors";

describe("hadyancode-pass-errors", () => {
	it("recognizes both raw and formatted HadyanCodePass subscription messages", () => {
		expect(
			isHadyanCodePassSubscriptionError(
				"the user is not subscribed to required model plan",
			),
		).toBe(true);

		const sdkFormatted =
			"No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan: https://app.cline.bot/dashboard/subscription?personal=true";
		const formatted = getCliNotSubscribedMessage();
		expect(isHadyanCodePassSubscriptionError(sdkFormatted)).toBe(true);
		expect(isHadyanCodePassSubscriptionError(formatted)).toBe(true);
		expect(formatCliErrorMessage(new Error(sdkFormatted))).toBe(formatted);
		expect(formatCliErrorMessage(new Error(formatted))).toBe(formatted);
	});

	it("recognizes and formats organization account individual subscription errors", () => {
		const raw =
			"403 Error 403: organization accounts cannot use individual model inference subscriptions";
		const formatted = getHadyanCodeOrgIndividualInferenceSubscriptionMessage();

		expect(isHadyanCodeOrgIndividualInferenceSubscriptionErrorMessage(raw)).toBe(
			true,
		);
		expect(
			isHadyanCodeOrgIndividualInferenceSubscriptionErrorMessage(
				new Error(formatted),
			),
		).toBe(true);
		expect(formatCliErrorMessage(new Error(raw))).toBe(formatted);
		expect(formatCliErrorMessage(new Error(raw))).not.toContain(
			"deepseek-v4-flash",
		);
	});

	it("recognizes and formats HadyanCodePass period limit errors with usage-billing guidance", () => {
		const raw =
			"Error: You have reached your 5-hour HadyanCodepass limit. The limit resets in 5h, please try again later.";
		const detail =
			"You have reached your 5-hour HadyanCodepass limit. The limit resets in 5h, please try again later.";

		expect(isHadyanCodePassLimitErrorMessage(raw)).toBe(true);
		expect(isHadyanCodePassLimitErrorMessage(new Error(raw))).toBe(true);
		expect(getHadyanCodePassLimitDetailMessage(raw)).toBe(detail);
		expect(formatCliErrorMessage(new Error(raw))).toBe(
			getCliHadyanCodePassLimitMessage(raw),
		);
		expect(formatCliErrorMessage(new Error(raw))).toContain(
			"Switch to HadyanCode usage-based billing",
		);
		expect(formatCliErrorMessage(new Error(raw))).toContain("--provider hadyancode");
	});

	it("recognizes and formats daily free model limits without usage-billing guidance", () => {
		const raw =
			"Error: Error 429: Daily free limit reached on model deepseek/deepseek-v4-flash. Try again in 23h 59m";

		expect(isHadyanCodeFreeModelLimitErrorMessage(raw)).toBe(true);
		expect(isHadyanCodeFreeModelLimitErrorMessage(new Error(raw))).toBe(true);
		expect(formatCliErrorMessage(new Error(raw))).toBe(
			getCliHadyanCodeFreeModelLimitMessage(raw),
		);
		expect(formatCliErrorMessage(new Error(raw))).not.toContain("Error 429");
		expect(formatCliErrorMessage(new Error(raw))).toContain(
			"Try again in 23h 59m",
		);
		expect(formatCliErrorMessage(new Error(raw))).toContain(
			"select another model",
		);
		expect(formatCliErrorMessage(new Error(raw))).not.toContain(
			"usage-based billing",
		);
		expect(
			isHadyanCodeFreeModelLimitErrorMessage(getCliHadyanCodeFreeModelLimitMessage(raw)),
		).toBe(true);
	});

	it("formats model-not-found errors for removed free models", () => {
		const raw = new Error("Error 404: model not found");

		expect(
			formatCliErrorMessage(raw, { modelId: "hadyancode-free/retired-model" }),
		).toContain("Free model promotion ended");
		expect(
			isHadyanCodeFreePromotionEndedErrorMessage(
				formatCliErrorMessage(raw, { modelId: "hadyancode-free/retired-model" }),
			),
		).toBe(true);
		expect(
			formatCliErrorMessage(raw, { modelId: "vendor/retired-model" }),
		).toBe(raw.message);
	});
});
