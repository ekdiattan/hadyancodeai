import { StringRequest } from "@shared/proto/hadyancode/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import { HadyanCodeAuthStatus } from "@/components/account/HadyanCodeAuthStatus"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useHadyanCodeAuth, useHadyanCodeSignIn } from "@/context/HadyanCodeAuthContext"
import { UiServiceClient } from "@/services/grpc-client"

export const HadyanCodeAccountInfoCard = ({ usageLink }: { usageLink?: string }) => {
	const { hadyancodeUser } = useHadyanCodeAuth()
	const { navigateToAccount } = useExtensionState()
	const { isLoginLoading, authStatusMessage, handleSignIn } = useHadyanCodeSignIn()
	const [didStartLogin, setDidStartLogin] = useState(false)

	const user = hadyancodeUser || undefined

	const handleLogin = () => {
		setDidStartLogin(true)
		handleSignIn()
	}

	useEffect(() => {
		if (didStartLogin && user) {
			navigateToAccount()
		}
	}, [didStartLogin, navigateToAccount, user])

	const handleShowAccount = () => {
		if (!usageLink) {
			return navigateToAccount()
		}

		UiServiceClient.openUrl(StringRequest.create({ value: usageLink })).catch((err) => {
			console.error("Failed to open usage link:", err)
		})
	}

	return (
		<div className="max-w-[600px]">
			{user ? (
				<VSCodeButton appearance="secondary" onClick={handleShowAccount}>
					View Billing & Usage
				</VSCodeButton>
			) : (
				<div className="flex flex-col gap-3">
					<VSCodeButton className="mt-0" disabled={isLoginLoading} onClick={handleLogin}>
						Sign Up with HadyanCode
						{isLoginLoading && (
							<span className="ml-1 animate-spin">
								<span className="codicon codicon-refresh" />
							</span>
						)}
					</VSCodeButton>
					<HadyanCodeAuthStatus message={authStatusMessage} />
				</div>
			)}
		</div>
	)
}
