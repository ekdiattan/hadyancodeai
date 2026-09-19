import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useHadyanCodePassPromo } from "@/hooks/useHadyanCodePassPromo"
import { StateServiceClient } from "@/services/grpc-client"
import { clearSessionBannerDismissalsForTesting } from "@/utils/sessionBannerDismissals"
import { HadyanCodePassHint } from "../HadyanCodePassHint"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

vi.mock("@/hooks/useHadyanCodePassPromo", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual as Record<string, unknown>),
		useHadyanCodePassPromo: vi.fn(),
	}
})

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	StateServiceClient: {
		dismissBanner: vi.fn(() => Promise.resolve({})),
	},
}))

vi.mock("../utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: vi.fn(),
}))

const mockHandleModeFieldChange = vi.fn(() => Promise.resolve())

const mockExtensionState = (overrides: Record<string, unknown> = {}) => {
	vi.mocked(useExtensionState).mockReturnValue({
		dismissedBanners: [],
		...overrides,
	} as any)
}

const mockPromo = (overrides: Partial<ReturnType<typeof useHadyanCodePassPromo>> = {}) => {
	vi.mocked(useHadyanCodePassPromo).mockReturnValue({
		isHadyanCodePassEnabled: true,
		...overrides,
	} as any)
}

describe("HadyanCodePassHint", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearSessionBannerDismissalsForTesting()
		mockPromo()
		vi.mocked(useApiConfigurationHandlers).mockReturnValue({
			handleModeFieldChange: mockHandleModeFieldChange,
		} as any)
		mockExtensionState()
	})

	it("shows the hint for non-HadyanCodePass providers", () => {
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		expect(screen.getByTestId("hadyancode-pass-settings-hint")).toBeInTheDocument()
	})

	it("selects the HadyanCodePass provider for the current mode when clicking Try it", () => {
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		fireEvent.click(screen.getByText("Try it"))
		expect(mockHandleModeFieldChange).toHaveBeenCalledWith(
			{ plan: "planModeApiProvider", act: "actModeApiProvider" },
			"hadyancode-pass",
			"plan",
		)
	})

	it("hides the hint when HadyanCodePass promotions are disabled (self-hosted or org allowlist)", () => {
		mockPromo({ isHadyanCodePassEnabled: false })
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		expect(screen.queryByTestId("hadyancode-pass-settings-hint")).not.toBeInTheDocument()
	})

	it("hides the hint when HadyanCodePass is already selected", () => {
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="hadyancode-pass" />)
		expect(screen.queryByTestId("hadyancode-pass-settings-hint")).not.toBeInTheDocument()
	})

	it("hides the hint once dismissed and persists the dismissal", () => {
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		fireEvent.click(screen.getByLabelText("Dismiss HadyanCodePass hint"))
		expect(screen.queryByTestId("hadyancode-pass-settings-hint")).not.toBeInTheDocument()
		expect(StateServiceClient.dismissBanner).toHaveBeenCalledWith({ value: "hadyancode-pass-settings-hint-v1" })
	})

	it("stays hidden after a remount within the same session", () => {
		const { unmount } = render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		fireEvent.click(screen.getByLabelText("Dismiss HadyanCodePass hint"))
		unmount()
		// Remount before the persisted dismissal has synced back from the host
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		expect(screen.queryByTestId("hadyancode-pass-settings-hint")).not.toBeInTheDocument()
	})

	it("stays hidden when a previous dismissal is in extension state", () => {
		mockExtensionState({ dismissedBanners: [{ bannerId: "hadyancode-pass-settings-hint-v1", dismissedAt: 1 }] })
		render(<HadyanCodePassHint currentMode="plan" selectedProvider="anthropic" />)
		expect(screen.queryByTestId("hadyancode-pass-settings-hint")).not.toBeInTheDocument()
	})
})
