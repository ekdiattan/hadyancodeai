import { describe, expect, it } from "vitest";
import {
	resolveProviderUsageCostDisplay,
	shouldShowProviderUsageCost,
} from "./billing";

describe("provider usage cost display", () => {
	it("hides usage cost for the Claude Code subscription provider", () => {
		expect(resolveProviderUsageCostDisplay("claude-code")).toBe("subscription");
		expect(shouldShowProviderUsageCost("claude-code")).toBe(false);
	});

	it("shows usage cost by default for usage-billed providers", () => {
		expect(resolveProviderUsageCostDisplay("anthropic")).toBe("show");
		expect(resolveProviderUsageCostDisplay("deepseek")).toBe("show");
		expect(shouldShowProviderUsageCost("anthropic")).toBe(true);
	});
});
