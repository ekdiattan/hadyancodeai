import { describe, expect, it, vi } from "vitest"

vi.mock("@/services/grpc-client", () => ({
	UiServiceClient: {
		openUrl: vi.fn(() => Promise.resolve({})),
	},
}))

import { buildHadyanCodePassSubscribeUrl, buildHadyanCodePassSubscriptionPageUrl } from "../hadyancodePassSubscribe"

describe("HadyanCodePass subscription URLs", () => {
	it("falls back to the default app base URL", () => {
		expect(buildHadyanCodePassSubscribeUrl(undefined)).toBe("https://app.cline.bot/onboarding/individual-plan")
		expect(buildHadyanCodePassSubscriptionPageUrl(undefined)).toBe(
			"https://app.cline.bot/dashboard/subscription?personal=true",
		)
	})

	it("preserves a path-prefixed app base URL", () => {
		expect(buildHadyanCodePassSubscribeUrl("https://proxy.example.com/hadyancode")).toBe(
			"https://proxy.example.com/hadyancode/onboarding/individual-plan",
		)
		expect(buildHadyanCodePassSubscriptionPageUrl("https://proxy.example.com/hadyancode")).toBe(
			"https://proxy.example.com/hadyancode/dashboard/subscription?personal=true",
		)
	})

	it("trims trailing slashes from the base URL", () => {
		expect(buildHadyanCodePassSubscribeUrl("https://app.cline.bot/")).toBe("https://app.cline.bot/onboarding/individual-plan")
	})
})
