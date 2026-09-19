import { describe, expect, it } from "vitest"
import { HadyanCodeError, HadyanCodeErrorType } from "../services/error/HadyanCodeError"
import { reshapeErrorForWebview } from "./message-translator"

// Once a free promotion ends the hadyancode-free/ model is removed from the catalog
// and the backend answers "model not found". These tests pin the host-side
// detection that turns that answer into the webview's promotion-ended card.
describe("reshapeErrorForWebview - free promotion ended", () => {
	it("stamps the promotion-ended code when a hadyancode-free model answers model-not-found", () => {
		const payload = reshapeErrorForWebview({ message: "Error 404: Model not found" }, "hadyancode", "hadyancode-free/glm-5")

		const parsed = JSON.parse(payload)
		expect(parsed.code).toBe("hadyancode_free_promotion_ended")
		expect(parsed.modelId).toBe("hadyancode-free/glm-5")
		expect(parsed.providerId).toBe("hadyancode")
		expect(parsed.details?.code).toBe("hadyancode_free_promotion_ended")
	})

	it("keeps the selected provider id, so hadyancode-pass selections stay attributed", () => {
		const payload = reshapeErrorForWebview({ message: "Model not found" }, "hadyancode-pass", "hadyancode-free/glm-5")

		expect(JSON.parse(payload).providerId).toBe("hadyancode-pass")
	})

	it("round-trips into the webview's HadyanCodeFreePromotionEnded classification", () => {
		const payload = reshapeErrorForWebview({ message: "Error 404: Model not found" }, "hadyancode", "hadyancode-free/glm-5")

		const hadyancodeError = HadyanCodeError.parse(payload)
		expect(hadyancodeError && HadyanCodeError.getErrorType(hadyancodeError)).toBe(
			HadyanCodeErrorType.HadyanCodeFreePromotionEnded,
		)
	})

	it("leaves model-not-found for a paid model on the generic guidance path", () => {
		const payload = reshapeErrorForWebview({ message: "Model not found" }, "hadyancode", "deepseek/deepseek-v4-flash")

		expect(payload).toBe(
			"Model not found This model may be retired or unavailable on your account. Switch to a different model in API Configuration settings, then retry.",
		)
	})

	it("leaves model-not-found on the generic guidance path when the model id is unknown", () => {
		const payload = reshapeErrorForWebview({ message: "Model not found" }, "hadyancode")

		expect(payload).toContain("This model may be retired or unavailable")
	})

	it("does not touch unrelated errors from a hadyancode-free model", () => {
		expect(reshapeErrorForWebview({ message: "socket hang up" }, "hadyancode", "hadyancode-free/glm-5")).toBe(
			"socket hang up",
		)
	})
})
