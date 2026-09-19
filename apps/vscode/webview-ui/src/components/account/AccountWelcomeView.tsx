import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { HadyanCodeAuthStatus } from "@/components/account/HadyanCodeAuthStatus"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useHadyanCodeSignIn } from "@/context/HadyanCodeAuthContext"
import HadyanCodeLogoVariable from "../../assets/HadyanCodeLogoVariable"
import { HadyanCodePassWelcomeCallout } from "./HadyanCodePassCard"

// export const AccountWelcomeView = () => (
// 	<div className="flex flex-col items-center pr-3 gap-2.5">
// 		<HadyanCodeLogoWhite className="size-16 mb-4" />
export const AccountWelcomeView = () => {
	const { environment } = useExtensionState()
	const { isLoginLoading, authStatusMessage, handleSignIn } = useHadyanCodeSignIn()

	return (
		<div className="flex flex-col items-center gap-2.5">
			<HadyanCodeLogoVariable className="size-16 mb-4" environment={environment} />

			<p>
				Sign up for an account to get access to the latest models, billing dashboard to view usage and credits, and more
				upcoming features.
			</p>

			<HadyanCodePassWelcomeCallout />

			<VSCodeButton className="w-full mb-4" disabled={isLoginLoading} onClick={handleSignIn}>
				Sign up with HadyanCode
				{isLoginLoading && (
					<span className="ml-1 animate-spin">
						<span className="codicon codicon-refresh" />
					</span>
				)}
			</VSCodeButton>

			<HadyanCodeAuthStatus message={authStatusMessage} />

			<p className="text-(--vscode-descriptionForeground) text-xs text-center m-0">
				By continuing, you agree to the <VSCodeLink href="https://cline.bot/tos">Terms of Service</VSCodeLink> and{" "}
				<VSCodeLink href="https://cline.bot/privacy">Privacy Policy.</VSCodeLink>
			</p>
		</div>
	)
}
