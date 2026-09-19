import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useHadyanCodePassPromo } from "@/hooks/useHadyanCodePassPromo"
import { HadyanCodePassCard, HadyanCodePassWelcomeCallout } from "../HadyanCodePassCard"

vi.mock("@/hooks/useHadyanCodePassPromo", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual as Record<string, unknown>),
		useHadyanCodePassPromo: vi.fn(),
	}
})

const mockPromo = (overrides: Partial<ReturnType<typeof useHadyanCodePassPromo>> = {}) => {
	vi.mocked(useHadyanCodePassPromo).mockReturnValue({
		isHadyanCodePassEnabled: true,
		isUsingHadyanCodePass: false,
		subscribeUrl: "https://app.cline.bot/onboarding/individual-plan",
		manageSubscriptionUrl: "https://app.cline.bot/dashboard/subscription",
		openSubscribePage: vi.fn(),
		openManageSubscriptionPage: vi.fn(),
		selectHadyanCodePassProvider: vi.fn(),
		switchToHadyanCodePassProvider: vi.fn(),
		...overrides,
	})
}

describe("HadyanCodePassCard", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders nothing when HadyanCodePass promotions are disabled", () => {
		mockPromo({ isHadyanCodePassEnabled: false })
		render(<HadyanCodePassCard />)
		expect(screen.queryByTestId("hadyancode-pass-card")).not.toBeInTheDocument()
	})

	it("promotes HadyanCodePass when the user is not on the HadyanCodePass provider", () => {
		mockPromo()
		render(<HadyanCodePassCard />)
		expect(screen.getByText("Get HadyanCodePass")).toBeInTheDocument()
		expect(screen.getByText("Use HadyanCodePass Provider")).toBeInTheDocument()
		expect(screen.queryByText("Manage Subscription")).not.toBeInTheDocument()
	})

	it("switches to the HadyanCodePass provider on click", () => {
		const switchToHadyanCodePassProvider = vi.fn().mockResolvedValue(undefined)
		mockPromo({ switchToHadyanCodePassProvider })
		render(<HadyanCodePassCard />)
		fireEvent.click(screen.getByText("Use HadyanCodePass Provider"))
		expect(switchToHadyanCodePassProvider).toHaveBeenCalledTimes(1)
	})

	it("links to subscription management when already using HadyanCodePass", () => {
		mockPromo({ isUsingHadyanCodePass: true })
		render(<HadyanCodePassCard />)
		expect(screen.getByText("Manage Subscription")).toBeInTheDocument()
		expect(screen.queryByText("Get HadyanCodePass")).not.toBeInTheDocument()
	})
})

describe("HadyanCodePassWelcomeCallout", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders nothing when HadyanCodePass promotions are disabled", () => {
		mockPromo({ isHadyanCodePassEnabled: false })
		render(<HadyanCodePassWelcomeCallout />)
		expect(screen.queryByTestId("hadyancode-pass-welcome-callout")).not.toBeInTheDocument()
	})

	it("mentions HadyanCodePass when promotions are enabled", () => {
		mockPromo()
		render(<HadyanCodePassWelcomeCallout />)
		expect(screen.getByTestId("hadyancode-pass-welcome-callout")).toHaveTextContent("HadyanCodePass")
	})
})
