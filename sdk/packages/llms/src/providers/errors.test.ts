import { describe, expect, it } from "vitest";
import { isHadyanCodePassLimitMessage } from "../index.browser";
import {
	extractHadyanCodeFreeModelLimitResetTime,
	extractHadyanCodePassLimitMessage,
	isHadyanCodeFreeModelLimitMessage,
} from "./errors";

describe("isHadyanCodePassLimitMessage", () => {
	it("matches the HadyanCodePass weekly limit message", () => {
		const message =
			"You have reached your weekly HadyanCodepass limit. The limit resets in 7d, please try again later.";
		expect(isHadyanCodePassLimitMessage(message)).toBe(true);
	});

	it("matches the 5-hour HadyanCodePass limit message", () => {
		const message =
			"You have reached your 5-hour HadyanCodepass limit. The limit resets in 5h, please try again later.";
		expect(isHadyanCodePassLimitMessage(message)).toBe(true);
	});

	it("handles tab-heavy non-matches without regex backtracking", () => {
		expect(
			isHadyanCodePassLimitMessage(`You have reached your\t${"\t".repeat(10_000)}`),
		).toBe(false);
		expect(
			isHadyanCodePassLimitMessage(`You have reached your\t-${"\t".repeat(10_000)}`),
		).toBe(false);
		expect(
			isHadyanCodePassLimitMessage(
				`You have reached your\t-\tHadyanCodepass limit.The limit resets in\t${"\t".repeat(10_000)}`,
			),
		).toBe(false);
	});
});

describe("extractHadyanCodePassLimitMessage", () => {
	it("extracts the HadyanCodePass weekly limit message", () => {
		const message =
			"You have reached your weekly HadyanCodepass limit. The limit resets in 7d, please try again later.";

		const extracted = extractHadyanCodePassLimitMessage(`Error: ${message}`);
		expect(extracted).toBe(message);
	});

	it("extracts the 5-hour HadyanCodePass limit message", () => {
		const message =
			"You have reached your 5-hour HadyanCodepass limit. The limit resets in 5h, please try again later.";

		const extracted = extractHadyanCodePassLimitMessage(`Error: ${message}`);
		expect(extracted).toBe(message);
	});
});

describe("HadyanCode free model limit messages", () => {
	const message =
		"Daily free limit reached on model deepseek/deepseek-v4-flash. Try again in 23h 59m";

	it("detects the message in an HTTP error", () => {
		const error = `Error: Error 429: ${message}`;
		expect(isHadyanCodeFreeModelLimitMessage(error)).toBe(true);
		expect(extractHadyanCodeFreeModelLimitResetTime(error)).toBe("23h 59m");
	});

	it("does not match unrelated daily limits", () => {
		expect(
			isHadyanCodeFreeModelLimitMessage(
				"Your daily spend limit has been reached. Try again in 23h 59m",
			),
		).toBe(false);
	});
});
