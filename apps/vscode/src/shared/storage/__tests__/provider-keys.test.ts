import { describe, it } from "bun:test"
import { getProviderCollectionSync } from "@hadyancode/llms"
import { expect } from "chai"
import { getProviderDefaultModelId, getProviderModelIdKey } from "../provider-keys"

describe("Provider key mapping", () => {
	it("returns the SDK-declared default for a static-list provider", () => {
		// Moonshot is a static-list provider with no NON_SDK_PROVIDER_DEFAULTS
		// override, so getProviderDefaultModelId delegates to the SDK.
		const expectedDefault = getProviderCollectionSync("moonshot")?.provider.defaultModelId ?? ""
		expect(getProviderDefaultModelId("moonshot")).to.equal(expectedDefault)
	})

	it("returns the openrouter default for the openrouter-routed providers", () => {
		// Dynamic providers that route through openrouter share its default.
		const openrouterDefault = getProviderDefaultModelId("openrouter")
		expect(openrouterDefault).to.be.a("string")
		expect(getProviderDefaultModelId("together")).to.equal(openrouterDefault)
		expect(getProviderDefaultModelId("aihubmix")).to.equal(openrouterDefault)
	})

	it("returns the SDK-declared default for the first-party gateway providers", () => {
		// hadyancode is a registered SDK provider, so it must not be pinned to
		// another provider's placeholder any more.
		const expectedDefault = getProviderCollectionSync("hadyancode")?.provider.defaultModelId ?? ""
		expect(expectedDefault).to.be.a("string")
		expect(getProviderDefaultModelId("hadyancode")).to.equal(expectedDefault)
	})

	it("returns an empty string for local-only providers", () => {
		expect(getProviderDefaultModelId("ollama")).to.equal("")
		expect(getProviderDefaultModelId("lmstudio")).to.equal("")
		expect(getProviderDefaultModelId("hicap")).to.equal("")
	})

	it("uses generic model key for Moonshot", () => {
		expect(getProviderModelIdKey("moonshot", "act")).to.equal("actModeApiModelId")
		expect(getProviderModelIdKey("moonshot", "plan")).to.equal("planModeApiModelId")
	})

	it("keeps provider-specific model key behavior for OpenRouter", () => {
		expect(getProviderModelIdKey("openrouter", "act")).to.equal("actModeOpenRouterModelId")
		expect(getProviderModelIdKey("openrouter", "plan")).to.equal("planModeOpenRouterModelId")
	})

	it("uses provider-specific model key behavior for HadyanCode", () => {
		expect(getProviderModelIdKey("hadyancode", "act")).to.equal("actModeHadyanCodeModelId")
		expect(getProviderModelIdKey("hadyancode", "plan")).to.equal("planModeHadyanCodeModelId")
	})

	it("uses separate model keys for HadyanCodePass", () => {
		expect(getProviderModelIdKey("hadyancode-pass", "act")).to.equal("actModeHadyanCodePassModelId")
		expect(getProviderModelIdKey("hadyancode-pass", "plan")).to.equal("planModeHadyanCodePassModelId")
	})

	it("uses the SDK-declared default for Nous Research through SDK-boundary casing", () => {
		const expectedDefault = getProviderCollectionSync("nousResearch")?.provider.defaultModelId ?? ""
		expect(getProviderDefaultModelId("nousResearch")).to.equal(expectedDefault)
		expect(getProviderDefaultModelId("nousresearch")).to.equal(expectedDefault)
		expect(expectedDefault).not.to.equal("")
	})
})
