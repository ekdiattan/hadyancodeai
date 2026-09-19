import type { HadyanCodeMessage } from "@shared/ExtensionMessage"
import { memo } from "react"
import { HadyanCodeAuthStatus } from "@/components/account/HadyanCodeAuthStatus"
import CreditLimitError from "@/components/chat/CreditLimitError"
import EntitlementError from "@/components/chat/EntitlementError"
import HadyanCodeFreeModelLimitError from "@/components/chat/HadyanCodeFreeModelLimitError"
import HadyanCodeFreePromotionEndedError from "@/components/chat/HadyanCodeFreePromotionEndedError"
import HadyanCodePassLimitError from "@/components/chat/HadyanCodePassLimitError"
import OrgHadyanCodePassRestrictionError from "@/components/chat/OrgHadyanCodePassRestrictionError"
import SpendLimitError from "@/components/chat/SpendLimitError"
import { Button } from "@/components/ui/button"
import { useHadyanCodeAuth, useHadyanCodeSignIn } from "@/context/HadyanCodeAuthContext"
import { HadyanCodeError, HadyanCodeErrorType } from "../../../../src/services/error/HadyanCodeError"

const _errorColor = "var(--vscode-errorForeground)"

interface ErrorRowProps {
	message: HadyanCodeMessage
	errorType: "error" | "mistake_limit_reached" | "diff_error" | "hadyancodeignore_error"
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
}

const ErrorRow = memo(({ message, errorType, apiRequestFailedMessage, apiReqStreamingFailedMessage }: ErrorRowProps) => {
	const { hadyancodeUser } = useHadyanCodeAuth()
	const rawApiError = apiRequestFailedMessage || apiReqStreamingFailedMessage

	const { isLoginLoading, authStatusMessage, handleSignIn } = useHadyanCodeSignIn()

	const renderErrorContent = () => {
		switch (errorType) {
			case "error":
			case "mistake_limit_reached":
				// Handle API request errors with special error parsing
				if (rawApiError) {
					// FIXME: HadyanCodeError parsing should not be applied to non-HadyanCode providers, but it seems we're using hadyancodeErrorMessage below in the default error display
					const hadyancodeError = HadyanCodeError.parse(rawApiError)
					const errorMessage = hadyancodeError?._error?.message || hadyancodeError?.message || rawApiError
					const requestId = hadyancodeError?._error?.request_id
					const providerId = hadyancodeError?.providerId || hadyancodeError?._error?.providerId
					// Deliberately narrower than the shared isHadyanCodeManagedProvider (which
					// also matches hadyancode-pass): only usage-billing errors get the credit
					// and login prompts below.
					const isHadyanCodeUsageBillingProvider = providerId === "hadyancode"
					const errorCode = hadyancodeError?._error?.code

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.Balance)) {
						const errorDetails = hadyancodeError._error?.details
						if (isHadyanCodeUsageBillingProvider || errorDetails?.buy_credits_url) {
							return (
								<CreditLimitError
									buyCreditsUrl={errorDetails?.buy_credits_url}
									currentBalance={errorDetails?.current_balance}
									message={errorDetails?.message}
									totalPromotions={errorDetails?.total_promotions}
									totalSpent={errorDetails?.total_spent}
								/>
							)
						}
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.SpendLimit)) {
						const d = hadyancodeError._error?.details
						return (
							<SpendLimitError
								budgetPeriod={d?.budget_period}
								limitUsd={d?.limit_usd}
								message={d?.message || errorMessage}
								resetsAt={d?.resets_at}
								spentUsd={d?.spent_usd}
							/>
						)
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.Entitlement)) {
						const detailMessage = hadyancodeError?._error?.details?.message || errorMessage
						return <EntitlementError message={detailMessage} />
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.OrgHadyanCodePassRestriction)) {
						return <OrgHadyanCodePassRestrictionError />
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.HadyanCodePassLimit)) {
						const detailMessage = hadyancodeError?._error?.details?.message || errorMessage
						return <HadyanCodePassLimitError message={detailMessage} />
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.HadyanCodeFreeModelLimit)) {
						const detailMessage = hadyancodeError?._error?.details?.message || errorMessage
						return <HadyanCodeFreeModelLimitError message={detailMessage} />
					}

					// A retired free model answers model-not-found once its promotion
					// ends — dedicated copy plus a route into the model picker,
					// since retrying the deleted model can never succeed.
					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.HadyanCodeFreePromotionEnded)) {
						return <HadyanCodeFreePromotionEndedError />
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.RateLimit)) {
						return (
							<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">
								{errorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</p>
						)
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.QuotaExceeded)) {
						const detailMessage = hadyancodeError?._error?.details?.message || errorMessage
						return <p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">{detailMessage}</p>
					}

					if (hadyancodeError?.isErrorType(HadyanCodeErrorType.Auth) && isHadyanCodeUsageBillingProvider) {
						return !hadyancodeUser ? (
							// User is using HadyanCode provider and is not logged in
							<div className="flex flex-col gap-3">
								<div className="flex items-center justify-center rounded border border-neutral-500/30 bg-vscode-editor-background p-6 text-center text-vscode-foreground">
									Whoops looks like you're logged out – click below to sign in
								</div>
								<Button className="w-full" disabled={isLoginLoading} onClick={handleSignIn}>
									Sign in to HadyanCode
									{isLoginLoading && (
										<span className="ml-1 animate-spin">
											<span className="codicon codicon-refresh" />
										</span>
									)}
								</Button>
								<HadyanCodeAuthStatus message={authStatusMessage} />
							</div>
						) : (
							// Don't show sign in button after the user has logged in, just ask them to retry
							<div className="mt-4">
								<span className="text-description">(Click "Retry" below)</span>
							</div>
						)
					}

					return (
						<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere flex flex-col gap-3">
							{/* Display the well-formatted error extracted from the HadyanCodeError instance */}

							<header>
								{providerId && <span className="uppercase">[{providerId}] </span>}
								{errorCode && <span>{errorCode}</span>}
								{errorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</header>

							{/* Windows Powershell Issue */}
							{errorMessage?.toLowerCase()?.includes("powershell") && (
								<div>
									It seems like you're having Windows PowerShell issues, please see this{" "}
									<a
										className="underline text-inherit"
										href="https://github.com/cline/hadyancode/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22">
										troubleshooting guide
									</a>
									.
								</div>
							)}

							{/* Display raw API error if different from parsed error message */}
							{errorMessage !== rawApiError && <div>{rawApiError}</div>}
						</p>
					)
				}

				// Regular error message
				return <p className="m-0 mt-0 whitespace-pre-wrap text-error wrap-anywhere">{message.text}</p>

			case "diff_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs opacity-80 bg-quote text-foreground">
						<div>The model used search patterns that don't match anything in the file. Retrying...</div>
					</div>
				)

			case "hadyancodeignore_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs opacity-80 bg-quote text-foreground">
						<div>
							HadyanCode tried to access <code>{message.text}</code> which is blocked by the{" "}
							<code>.hadyancodeignore</code>
							file.
						</div>
					</div>
				)

			default:
				return null
		}
	}

	// For diff_error and hadyancodeignore_error, we don't show the header separately
	if (errorType === "diff_error" || errorType === "hadyancodeignore_error") {
		return renderErrorContent()
	}

	// For other error types, show header + content
	return renderErrorContent()
})

export default ErrorRow
