import type { ApiConfiguration } from "@shared/api"
import { UpdateApiConfigurationRequest } from "@shared/proto/hadyancode/models"
import { convertApiConfigurationToProto } from "@shared/proto-conversions/models/api-configuration-conversion"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"

interface HadyanCodePassLimitErrorProps {
	message: string
}

const HADYANCODE_PROVIDER_ID = "hadyancode"

const getProviderSwitchConfig = (apiConfiguration: ApiConfiguration): ApiConfiguration => {
	return {
		...apiConfiguration,
		planModeApiProvider: HADYANCODE_PROVIDER_ID,
		actModeApiProvider: HADYANCODE_PROVIDER_ID,
	}
}

const HadyanCodePassLimitError = ({ message }: HadyanCodePassLimitErrorProps) => {
	const { apiConfiguration } = useExtensionState()
	const [isSwitching, setIsSwitching] = useState(false)
	const [didSwitch, setDidSwitch] = useState(false)
	const [error, setError] = useState<string | undefined>()

	const handleSwitchToUsageBasedBilling = async () => {
		setIsSwitching(true)
		setError(undefined)
		try {
			const protoConfig = convertApiConfigurationToProto(getProviderSwitchConfig(apiConfiguration ?? {}))
			await ModelsServiceClient.updateApiConfigurationProto(
				UpdateApiConfigurationRequest.create({
					apiConfiguration: protoConfig,
				}),
			)
			setDidSwitch(true)
		} catch (error) {
			console.error("Failed to switch to HadyanCode usage-based billing:", error)
			setError("Failed to switch provider. Select HadyanCode Usage-Billing in API Configuration settings.")
		} finally {
			setIsSwitching(false)
		}
	}

	return (
		<div
			className="p-2 border-none rounded-md mb-2 bg-(--vscode-textBlockQuote-background)"
			data-testid="hadyancode-pass-limit-error">
			<div className="text-error mb-2">HadyanCodePass limit reached</div>
			<div className="text-(--vscode-descriptionForeground) text-xs wrap-anywhere">{message}</div>
			<div className="text-(--vscode-descriptionForeground) text-xs mt-2">
				Would you like to switch to Usage-Based billing and retry with the HadyanCode provider?
			</div>
			<VSCodeButton
				appearance="primary"
				className="w-full mt-3"
				disabled={isSwitching || didSwitch}
				onClick={handleSwitchToUsageBasedBilling}>
				{isSwitching ? "Switching..." : didSwitch ? "Switched to Usage-Based billing" : "Switch to Usage-Based billing"}
			</VSCodeButton>
			{didSwitch && (
				<div className="text-(--vscode-descriptionForeground) text-xs mt-2">Retry the request after switching.</div>
			)}
			{error && <div className="text-error text-xs mt-2">{error}</div>}
		</div>
	)
}

export default HadyanCodePassLimitError
