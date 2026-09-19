import { describe, it } from "bun:test"
import "should"
import { HadyanCodeError, HadyanCodeErrorType } from "../HadyanCodeError"

describe("HadyanCodeError", () => {
	describe("getErrorType", () => {
		it("should return QuotaExceeded when code is INFERENCE_CAP_ERROR", () => {
			const err = new HadyanCodeError({ message: "Inference cap reached", code: "INFERENCE_CAP_ERROR" })
			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.QuotaExceeded)
		})

		it("should return Entitlement for the SDK HadyanCodePass subscription message", () => {
			const err = new HadyanCodeError(
				"No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan:",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.Entitlement)
		})

		it("should return Entitlement for the SDK HadyanCodePass subscription message with a different app URL", () => {
			const err = new HadyanCodeError(
				"No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan:",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.Entitlement)
		})

		it("should return Entitlement for the raw required-plan message", () => {
			const err = new HadyanCodeError("403 Error 403: the user is not subscribed to required model plan")

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.Entitlement)
		})

		it("should classify the SDK org individual subscription message separately", () => {
			const err = new HadyanCodeError(
				"Organization accounts cannot use HadyanCodePass subscriptions. Go to /account -> change account to switch to your personal account for HadyanCodePass",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.OrgHadyanCodePassRestriction)
		})

		it("should classify the raw organization individual subscription message separately", () => {
			const err = new HadyanCodeError(
				"403 Error 403: organization accounts cannot use individual model inference subscriptions",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.OrgHadyanCodePassRestriction)
		})

		it("should classify HadyanCodePass period limit messages separately", () => {
			const err = new HadyanCodeError(
				"You have reached your weekly HadyanCodepass limit. The limit resets in 7d, please try again later.",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.HadyanCodePassLimit)
		})

		it("should classify nested HadyanCodePass period limit messages separately", () => {
			const err = new HadyanCodeError({
				message: "403 Error 403",
				error: {
					message:
						"You have reached your monthly HadyanCodePass limit. The limit resets in 12h, please try again later.",
				},
			})

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.HadyanCodePassLimit)
		})

		it("should classify daily HadyanCode free model limits separately", () => {
			const err = new HadyanCodeError(
				"Error: Error 429: Daily free limit reached on model deepseek/deepseek-v4-flash. Try again in 23h 59m",
			)

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.HadyanCodeFreeModelLimit)
		})

		it("should classify the host-stamped promotion-ended code as HadyanCodeFreePromotionEnded", () => {
			// reshapeErrorForWebview stamps this code when the active model is a
			// retired hadyancode-free/ id (see message-translator).
			const err = new HadyanCodeError({
				message: "Model not found",
				code: "hadyancode_free_promotion_ended",
			})

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.HadyanCodeFreePromotionEnded)
		})

		it("should classify model-not-found for a hadyancode-free model as HadyanCodeFreePromotionEnded", () => {
			const err = new HadyanCodeError({ message: "Error 404: Model not found" }, "hadyancode-free/glm-5")

			HadyanCodeError.getErrorType(err)!.should.equal(HadyanCodeErrorType.HadyanCodeFreePromotionEnded)
		})

		it("should prefer HadyanCodeFreePromotionEnded over Auth for a 404 with a hadyancode-free model", () => {
			// A 404 falls inside the generic 401-428 auth-status range; the
			// promotion-ended classification must win.
			const err = new HadyanCodeError({ message: "Error 404: Model not found", status: 404 }, "hadyancode-free/glm-5")

			const result = HadyanCodeError.getErrorType(err)
			result!.should.equal(HadyanCodeErrorType.HadyanCodeFreePromotionEnded)
		})

		it("should keep model-not-found for a non-free model on the generic path", () => {
			const err = new HadyanCodeError({ message: "Error 404: Model not found", status: 404 }, "deepseek/deepseek-v4-flash")

			const result = HadyanCodeError.getErrorType(err)
			;(result !== HadyanCodeErrorType.HadyanCodeFreePromotionEnded).should.be.true()
		})

		it("should not classify unrelated hadyancode-free errors as HadyanCodeFreePromotionEnded", () => {
			const err = new HadyanCodeError({ message: "Network error: socket hang up" }, "hadyancode-free/glm-5")

			const result = HadyanCodeError.getErrorType(err)
			;(result !== HadyanCodeErrorType.HadyanCodeFreePromotionEnded).should.be.true()
		})
	})
})
