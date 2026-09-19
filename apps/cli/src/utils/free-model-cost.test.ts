import type { AgentEvent } from "@hadyancode/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearHadyanCodeFreeModelCostCache,
	shouldZeroHadyanCodeFreeModelCost,
	zeroCliAgentEventCost,
	zeroCliUsageCost,
} from "./free-model-cost";

afterEach(() => {
	clearHadyanCodeFreeModelCostCache();
	vi.unstubAllGlobals();
});

describe("shouldZeroHadyanCodeFreeModelCost", () => {
	it("uses the HadyanCode free model list", async () => {
		const fetchMock = vi.fn(
			async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => {
				return new Response(
					JSON.stringify({
						free: [{ id: "deepseek/deepseek-v4-flash" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			},
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode",
				modelId: "deepseek/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(true);

		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"https://hadyancode.test/api/v1/ai/hadyancode/recommended-models",
		);
	});

	it("matches hadyancode-free model ids from the free endpoint bucket exactly", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						free: [{ id: "hadyancode-free/deepseek-v4-flash" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}),
		);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode",
				modelId: "hadyancode-free/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(true);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode-pass",
				modelId: "deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(false);
	});

	it("does not zero non-HadyanCode providers", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "openrouter",
				modelId: "deepseek/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("zeros cost of free models selected on the hadyancode-pass provider", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						free: [{ id: "deepseek/deepseek-v4-flash" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}),
		);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode-pass",
				modelId: "deepseek/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(true);

		// subscription (hadyancode-pass/...) models are not in the free bucket
		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode-pass",
				modelId: "hadyancode-pass/glm-5.1",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(false);
	});

	it("does not match a paid model by only the final path segment", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						free: [{ id: "deepseek/deepseek-v4-flash" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}),
		);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode",
				modelId: "acme/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(false);
	});

	it("retries after a failed free model list fetch", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						free: [{ id: "deepseek/deepseek-v4-flash" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode",
				modelId: "deepseek/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(false);
		await expect(
			shouldZeroHadyanCodeFreeModelCost({
				providerId: "hadyancode",
				modelId: "deepseek/deepseek-v4-flash",
				baseUrl: "https://hadyancode.test/api/v1",
			}),
		).resolves.toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

describe("zeroCliUsageCost", () => {
	it("zeros total cost while preserving token usage", () => {
		expect(
			zeroCliUsageCost(
				{
					inputTokens: 10,
					outputTokens: 5,
					totalCost: 0.001,
				},
				true,
			),
		).toEqual({
			inputTokens: 10,
			outputTokens: 5,
			totalCost: 0,
		});
	});
});

describe("zeroCliAgentEventCost", () => {
	it("zeros usage event cost fields", () => {
		const event = {
			type: "usage",
			inputTokens: 10,
			outputTokens: 5,
			cost: 0.001,
			totalCost: 0.001,
		} as AgentEvent;

		expect(zeroCliAgentEventCost(event, true)).toMatchObject({
			cost: 0,
			totalCost: 0,
		});
	});

	it("zeros done event usage cost", () => {
		const event = {
			type: "done",
			reason: "completed",
			text: "ok",
			iterations: 1,
			usage: {
				inputTokens: 10,
				outputTokens: 5,
				totalCost: 0.001,
			},
		} as AgentEvent;

		expect(zeroCliAgentEventCost(event, true)).toMatchObject({
			usage: { totalCost: 0 },
		});
	});
});
