import type { GatewayProviderManifest } from "@hadyancode/shared";
import { describe, expect, it } from "vitest";
import {
	BUILTIN_MODEL_OPERATION_CAPABILITIES,
	BUILTIN_TRANSCRIPTION_TRANSPORTS,
	builtinProviderSupportsModelOperation,
	normalizeBuiltinModelOperationModalities,
	providerManifestSupportsModelOperation,
} from "./model-operations";

describe("model operation capabilities", () => {
	it("keeps every declared transcription transport paired with a capability", () => {
		for (const [providerId, descriptor] of Object.entries(
			BUILTIN_TRANSCRIPTION_TRANSPORTS,
		)) {
			const capability = BUILTIN_MODEL_OPERATION_CAPABILITIES[providerId]?.find(
				(candidate) => candidate.operation === "transcription",
			);
			expect(capability?.modes).toEqual(descriptor.modes);
		}
		for (const [providerId, capabilities] of Object.entries(
			BUILTIN_MODEL_OPERATION_CAPABILITIES,
		)) {
			if (
				capabilities.some(
					(capability) => capability.operation === "transcription",
				)
			) {
				expect(BUILTIN_TRANSCRIPTION_TRANSPORTS).toHaveProperty(providerId);
			}
		}
	});

	it("does not infer media operations for unregistered providers", () => {
		expect(
			builtinProviderSupportsModelOperation({
				providerId: "openai-native",
				modelId: "gpt-image-2",
				operation: "image-generation",
				modalities: { input: ["text"], output: ["image"] },
			}),
		).toBe(false);
	});

	it("keeps ordinary text language models available without a special transport", () => {
		expect(
			builtinProviderSupportsModelOperation({
				providerId: "custom-compatible",
				modelId: "chat-model",
				operation: "language",
				modalities: { input: ["text"], output: ["text"] },
			}),
		).toBe(true);
	});

	it("resolves custom operations from manifest capabilities", () => {
		const manifest = {
			id: "custom-media",
			name: "Custom Media",
			defaultModelId: "artist",
			models: [
				{
					id: "artist",
					name: "Artist",
					providerId: "custom-media",
					operation: "image-generation",
					modalities: { input: ["text"], output: ["image"] },
				},
			],
			modelOperationCapabilities: [
				{
					operation: "image-generation",
					inputModalities: ["text"],
					outputModalities: ["image"],
				},
			],
		} satisfies GatewayProviderManifest;

		expect(
			providerManifestSupportsModelOperation(manifest, manifest.models[0]),
		).toBe(true);
	});
});
