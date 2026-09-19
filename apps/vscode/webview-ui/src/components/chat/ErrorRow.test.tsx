import type { HadyanCodeMessage } from "@shared/ExtensionMessage"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ErrorRow from "./ErrorRow"

const mockSetUserOrganization = vi.hoisted(() => vi.fn())
const mockUpdateApiConfigurationProto = vi.hoisted(() => vi.fn())
const mockNavigateToSettingsModelPicker = vi.hoisted(() => vi.fn())
const mockApiConfiguration = vi.hoisted(() => ({
	planModeApiProvider: "hadyancode-pass",
	actModeApiProvider: "hadyancode-pass",
	planModeHadyanCodePassModelId: "hadyancode-pass/test-plan-model",
	actModeHadyanCodePassModelId: "hadyancode-pass/test-act-model",
}))

// Mock the auth context
vi.mock("@/context/HadyanCodeAuthContext", () => ({
	useHadyanCodeAuth: () => ({
		hadyancodeUser: null,
	}),
	useHadyanCodeSignIn: () => ({
		isLoginLoading: false,
	}),
	handleSignOut: vi.fn(),
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		apiConfiguration: mockApiConfiguration,
		mode: "act",
		providerModelsByProvider: {},
		startProviderModelsRequest: vi.fn(),
		applyProviderModelsResponse: vi.fn(),
		navigateToSettingsModelPicker: mockNavigateToSettingsModelPicker,
	}),
}))

// Mock CreditLimitError component
vi.mock("@/components/chat/CreditLimitError", () => ({
	default: ({ message }: { message: string }) => <div data-testid="credit-limit-error">{message}</div>,
}))

// Mock EntitlementError component
vi.mock("@/components/chat/EntitlementError", () => ({
	default: ({ message }: { message: string }) => <div data-testid="entitlement-error">{message}</div>,
}))

vi.mock("@/services/grpc-client", () => ({
	AccountServiceClient: {
		setUserOrganization: mockSetUserOrganization,
	},
	ModelsServiceClient: {
		updateApiConfigurationProto: mockUpdateApiConfigurationProto,
		commitModelSelection: vi.fn().mockResolvedValue({}),
		resolveProviderModels: vi.fn().mockResolvedValue({ providerId: "hadyancode", models: {} }),
	},
}))

// Mock HadyanCodeError
vi.mock("../../../../src/services/error/HadyanCodeError", () => ({
	HadyanCodeError: {
		parse: vi.fn(),
	},
	HadyanCodeErrorType: {
		Balance: "balance",
		RateLimit: "rateLimit",
		Auth: "auth",
		Entitlement: "entitlement",
		OrgHadyanCodePassRestriction: "orgHadyanCodePassRestriction",
		HadyanCodePassLimit: "hadyancodePassLimit",
		HadyanCodeFreeModelLimit: "hadyancodeFreeModelLimit",
		HadyanCodeFreePromotionEnded: "hadyancodeFreePromotionEnded",
		QuotaExceeded: "quotaExceeded",
	},
}))

describe("ErrorRow", () => {
	const mockMessage: HadyanCodeMessage = {
		ts: 123456789,
		type: "say",
		say: "error",
		text: "Test error message",
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockSetUserOrganization.mockResolvedValue({})
		mockUpdateApiConfigurationProto.mockResolvedValue({})
	})

	it("renders basic error message", () => {
		render(<ErrorRow errorType="error" message={mockMessage} />)

		expect(screen.getByText("Test error message")).toBeInTheDocument()
	})

	it("renders mistake limit reached error", () => {
		const mistakeMessage = { ...mockMessage, text: "Mistake limit reached" }
		render(<ErrorRow errorType="mistake_limit_reached" message={mistakeMessage} />)

		expect(screen.getByText("Mistake limit reached")).toBeInTheDocument()
	})

	it("renders diff error", () => {
		render(<ErrorRow errorType="diff_error" message={mockMessage} />)

		expect(
			screen.getByText("The model used search patterns that don't match anything in the file. Retrying..."),
		).toBeInTheDocument()
	})

	it("renders hadyancodeignore error", () => {
		const hadyancodeignoreMessage = { ...mockMessage, text: "/path/to/file.txt" }
		render(<ErrorRow errorType="hadyancodeignore_error" message={hadyancodeignoreMessage} />)

		expect(screen.getByText(/HadyanCode tried to access/)).toBeInTheDocument()
		expect(screen.getByText("/path/to/file.txt")).toBeInTheDocument()
	})

	describe("API error handling", () => {
		it("renders credit limit error when balance error is detected", async () => {
			const mockHadyanCodeError = {
				message: "Insufficient credits",
				isErrorType: vi.fn((type) => type === "balance"),
				_error: {
					details: {
						current_balance: 0,
						total_spent: 10.5,
						total_promotions: 5.0,
						message: "You have run out of credits.",
						buy_credits_url: "https://app.cline.bot/dashboard",
					},
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage="Insufficient credits error" errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("credit-limit-error")).toBeInTheDocument()
			expect(screen.getByText("You have run out of credits.")).toBeInTheDocument()
		})

		it("does not show HadyanCode credits CTA for non-HadyanCode balance errors without a provider URL", async () => {
			const mockHadyanCodeError = {
				message: "Not enough credits available",
				providerId: "zai",
				isErrorType: vi.fn((type) => type === "balance"),
				_error: {
					code: "insufficient_credits",
					providerId: "zai",
					details: {
						current_balance: 0,
						message: "Not enough credits available",
					},
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage="Insufficient credits error" errorType="error" message={mockMessage} />)

			expect(screen.queryByTestId("credit-limit-error")).not.toBeInTheDocument()
			expect(screen.getByText(/\[zai\]/)).toBeInTheDocument()
		})

		it("renders rate limit error with request ID", async () => {
			const mockHadyanCodeError = {
				message: "Rate limit exceeded",
				isErrorType: vi.fn((type) => type === "rateLimit"),
				_error: {
					request_id: "req_123456",
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage="Rate limit exceeded" errorType="error" message={mockMessage} />)

			expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument()
			expect(screen.getByText("Request ID: req_123456")).toBeInTheDocument()
		})

		it("renders quota exceeded error", async () => {
			const mockHadyanCodeError = {
				message: "Inference cap reached",
				isErrorType: vi.fn((type) => type === "quotaexceeded"),
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage="The message" errorType="error" message="" />)
			expect(screen.getByText("Inference cap reached")).toBeInTheDocument()
		})

		it("renders entitlement error when HadyanCodeError detects HadyanCodeNotSubscribedError", async () => {
			const cliMessage =
				"No access to HadyanCodePass subscription models yet. Subscribe to HadyanCodePass, the low cost open weights model coding plan:"
			const mockHadyanCodeError = {
				message: cliMessage,
				isErrorType: vi.fn((type) => type === "entitlement"),
				providerId: "hadyancode-pass",
				_error: {
					message: cliMessage,
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={cliMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("entitlement-error")).toBeInTheDocument()
			expect(screen.getByText(cliMessage)).toBeInTheDocument()
			expect(screen.queryByText(/\[hadyancode-pass\]/i)).not.toBeInTheDocument()
		})

		it("renders entitlement error when HadyanCodeError detects a raw required-plan message", async () => {
			const rawMessage = "403 Error 403: the user is not subscribed to required model plan"
			const mockHadyanCodeError = {
				message: rawMessage,
				isErrorType: vi.fn((type) => type === "entitlement"),
				providerId: "hadyancode-pass",
				_error: {
					message: rawMessage,
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={rawMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("entitlement-error")).toBeInTheDocument()
			expect(screen.getByText(rawMessage)).toBeInTheDocument()
		})

		it("renders organization account HadyanCodePass restriction with friendly account switching copy", async () => {
			const rawMessage = "403 Error 403: organization accounts cannot use individual model inference subscriptions"
			const mockHadyanCodeError = {
				message: rawMessage,
				isErrorType: vi.fn((type) => type === "orgHadyanCodePassRestriction"),
				providerId: "hadyancode",
				_error: {
					message: rawMessage,
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={rawMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("org-hadyancode-pass-restriction-error")).toBeInTheDocument()
			expect(screen.getByText(/Organization accounts cannot use HadyanCodePass subscriptions/)).toBeInTheDocument()
			expect(screen.queryByText(rawMessage)).not.toBeInTheDocument()

			fireEvent.click(screen.getByText("Switch to personal account"))

			await waitFor(() => expect(mockSetUserOrganization).toHaveBeenCalledWith({}))
			expect(screen.getByText("Switched to personal account")).toBeInTheDocument()
		})

		it("renders organization HadyanCodePass restriction when HadyanCodeError detects the SDK formatted message", async () => {
			const formattedMessage =
				"Organization accounts cannot use HadyanCodePass subscriptions. Go to /account -> change account to switch to your personal account for HadyanCodePass"
			const mockHadyanCodeError = {
				message: formattedMessage,
				isErrorType: vi.fn((type) => type === "orgHadyanCodePassRestriction"),
				providerId: "hadyancode-pass",
				_error: {
					message: formattedMessage,
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={formattedMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("org-hadyancode-pass-restriction-error")).toBeInTheDocument()
			expect(screen.queryByText(formattedMessage)).not.toBeInTheDocument()
		})

		it("renders HadyanCodePass limit error and switches to HadyanCode usage-based billing", async () => {
			const limitMessage =
				"You have reached your weekly HadyanCodepass limit. The limit resets in 7d, please try again later."
			const mockHadyanCodeError = {
				message: limitMessage,
				isErrorType: vi.fn((type) => type === "hadyancodePassLimit"),
				providerId: "hadyancode-pass",
				_error: {
					message: limitMessage,
				},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={limitMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("hadyancode-pass-limit-error")).toBeInTheDocument()
			expect(screen.getByText(limitMessage)).toBeInTheDocument()

			fireEvent.click(screen.getByText("Switch to Usage-Based billing"))

			await waitFor(() => expect(mockUpdateApiConfigurationProto).toHaveBeenCalledTimes(1))
			const request = mockUpdateApiConfigurationProto.mock.calls[0][0]
			expect(request.apiConfiguration.planModeApiProvider).toBe("hadyancode")
			expect(request.apiConfiguration.actModeApiProvider).toBe("hadyancode")
			expect(request.apiConfiguration.planModeHadyanCodeModelId).toBeUndefined()
			expect(request.apiConfiguration.actModeHadyanCodeModelId).toBeUndefined()
			expect(screen.getByText("Switched to Usage-Based billing")).toBeInTheDocument()
		})

		it("renders a daily free model limit without usage-billing guidance", async () => {
			const limitMessage = "Daily free limit reached on model deepseek/deepseek-v4-flash. Try again in 23h 59m"
			const mockHadyanCodeError = {
				message: limitMessage,
				isErrorType: vi.fn((type) => type === "hadyancodeFreeModelLimit"),
				providerId: "hadyancode",
				_error: { message: limitMessage },
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={limitMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("hadyancode-free-model-limit-error")).toBeInTheDocument()
			expect(screen.getByText(/You've reached today's free usage limit for this model/)).toBeInTheDocument()
			expect(screen.getByText(/Try again in 23h 59m/)).toBeInTheDocument()
			expect(screen.queryByText(limitMessage)).not.toBeInTheDocument()
			expect(screen.queryByText(/deepseek-v4-flash/i)).not.toBeInTheDocument()
			expect(screen.queryByText(/Switch to Usage-Based billing/i)).not.toBeInTheDocument()
		})

		it("renders the promotion-ended card with a route into the model picker", async () => {
			const rawMessage = "Error 404: Model not found"
			const mockHadyanCodeError = {
				message: rawMessage,
				isErrorType: vi.fn((type) => type === "hadyancodeFreePromotionEnded"),
				providerId: "hadyancode",
				modelId: "hadyancode-free/glm-5",
				_error: { message: rawMessage },
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage={rawMessage} errorType="error" message={mockMessage} />)

			expect(screen.getByTestId("hadyancode-free-promotion-ended-error")).toBeInTheDocument()
			expect(screen.getByText("Free model promotion ended")).toBeInTheDocument()
			expect(screen.getByText(/no longer available/)).toBeInTheDocument()
			// The raw backend message is replaced by the dedicated copy.
			expect(screen.queryByText(rawMessage)).not.toBeInTheDocument()

			fireEvent.click(screen.getByText("Select a Model"))
			expect(mockNavigateToSettingsModelPicker).toHaveBeenCalledWith({ targetSection: "api-config" })
		})

		it("renders friendly logged-out message and sign in button when user is not signed in", async () => {
			const mockHadyanCodeError = {
				message: "Authentication failed",
				isErrorType: vi.fn((type) => type === "auth"),
				providerId: "hadyancode",
				_error: {},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiRequestFailedMessage="Authentication failed" errorType="error" message={mockMessage} />)

			expect(screen.queryByText("Authentication failed")).not.toBeInTheDocument()
			expect(screen.getByText(/Whoops looks like you're logged out/)).toBeInTheDocument()
			expect(screen.getByText("Sign in to HadyanCode")).toBeInTheDocument()
		})

		it("renders PowerShell troubleshooting link when error mentions PowerShell", async () => {
			const mockHadyanCodeError = {
				message: "PowerShell is not recognized as an internal or external command",
				isErrorType: vi.fn(() => false),
				_error: {},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(
				<ErrorRow
					apiRequestFailedMessage="PowerShell is not recognized as an internal or external command"
					errorType="error"
					message={mockMessage}
				/>,
			)

			expect(screen.getByText(/PowerShell is not recognized/)).toBeInTheDocument()
			expect(screen.getByText("troubleshooting guide")).toBeInTheDocument()
			expect(screen.getByRole("link", { name: "troubleshooting guide" })).toHaveAttribute(
				"href",
				"https://github.com/cline/hadyancode/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22",
			)
		})

		it("handles apiReqStreamingFailedMessage instead of apiRequestFailedMessage", async () => {
			const mockHadyanCodeError = {
				message: "Streaming failed",
				isErrorType: vi.fn(() => false),
				_error: {},
			}

			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(mockHadyanCodeError as any)

			render(<ErrorRow apiReqStreamingFailedMessage="Streaming failed" errorType="error" message={mockMessage} />)

			expect(screen.getByText("Streaming failed")).toBeInTheDocument()
		})

		it("falls back to regular error message when HadyanCodeError.parse returns null", async () => {
			const { HadyanCodeError } = await import("../../../../src/services/error/HadyanCodeError")
			vi.mocked(HadyanCodeError.parse).mockReturnValue(undefined)

			render(<ErrorRow apiRequestFailedMessage="Some API error" errorType="error" message={mockMessage} />)

			// When HadyanCodeError.parse returns null, we display the raw error message for non-HadyanCode providers
			// Since hadyancodeError is undefined, isHadyanCodeUsageBillingProvider is false, so we show the raw apiRequestFailedMessage
			expect(screen.getByText("Some API error")).toBeInTheDocument()
		})

		it("renders regular error message when no API error messages are provided", () => {
			render(<ErrorRow errorType="error" message={mockMessage} />)

			expect(screen.getByText("Test error message")).toBeInTheDocument()
		})
	})
})
