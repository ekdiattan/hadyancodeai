import { openAiModelInfoSafeDefaults } from "@shared/api"
import { CommitModelSelectionRequest } from "@shared/proto/hadyancode/models"
import type { Mode } from "@shared/storage/types"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useMemo, useState } from "react"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ModelsServiceClient } from "@/services/grpc-client"

interface HadyanCodeFreeModelLimitErrorProps {
	message: string
}

const HADYANCODE_PROVIDER_ID = "hadyancode"
const HADYANCODE_FREE_MODEL_PREFIX = "hadyancode-free/"
const FREE_MODEL_LIMIT_RETRY_MARKER = "try again in "

function extractFreeModelLimitResetTime(message: string): string | undefined {
	const backendMessage = message.toLowerCase()
	const resetStart = backendMessage.indexOf(FREE_MODEL_LIMIT_RETRY_MARKER)
	if (resetStart === -1) {
		return undefined
	}

	const resetTime = backendMessage.slice(resetStart + FREE_MODEL_LIMIT_RETRY_MARKER.length).trim()
	return resetTime || undefined
}

// Free model ids are hadyancode-free/<model-slug>; their paid counterpart is the
// catalog model with the same slug under its lab prefix (e.g.
// hadyancode-free/deepseek-v4-flash -> deepseek/deepseek-v4-flash).
function findPaidModelId(freeModelId: string | undefined, hadyancodeModelIds: string[]): string | undefined {
	if (!freeModelId?.startsWith(HADYANCODE_FREE_MODEL_PREFIX)) {
		return undefined
	}

	const modelSlug = freeModelId.slice(HADYANCODE_FREE_MODEL_PREFIX.length)
	if (!modelSlug) {
		return undefined
	}

	return hadyancodeModelIds.find(
		(modelId) =>
			!modelId.startsWith(HADYANCODE_FREE_MODEL_PREFIX) && (modelId === modelSlug || modelId.endsWith(`/${modelSlug}`)),
	)
}

const HadyanCodeFreeModelLimitError = ({ message }: HadyanCodeFreeModelLimitErrorProps) => {
	const { apiConfiguration, mode } = useExtensionState()
	const { models: hadyancodeModels } = useProviderModels(HADYANCODE_PROVIDER_ID)
	const { handleModeFieldsChange } = useApiConfigurationHandlers()
	const [isSwitching, setIsSwitching] = useState(false)
	const [didSwitch, setDidSwitch] = useState(false)
	const [switchError, setSwitchError] = useState<string | undefined>()

	const resetTime = extractFreeModelLimitResetTime(message)
	const currentMode: Mode = mode ?? "act"
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	// Free models are selectable on both the hadyancode and hadyancode-pass providers, so
	// read the model id from whichever provider is currently selected.
	const selectedFreeModelId =
		modeFields.apiProvider === "hadyancode-pass"
			? modeFields.hadyancodePassModelId
			: modeFields.apiProvider === HADYANCODE_PROVIDER_ID
				? modeFields.hadyancodeModelId
				: undefined
	const paidModelId = useMemo(
		() => findPaidModelId(selectedFreeModelId, Object.keys(hadyancodeModels ?? {})),
		[selectedFreeModelId, hadyancodeModels],
	)

	const handleSwitchToPaidModel = async () => {
		if (!paidModelId) {
			return
		}
		setIsSwitching(true)
		setSwitchError(undefined)
		try {
			const modelInfo = hadyancodeModels?.[paidModelId] ?? {
				...openAiModelInfoSafeDefaults,
				name: paidModelId,
			}

			await ModelsServiceClient.commitModelSelection(
				CommitModelSelectionRequest.create({
					providerId: HADYANCODE_PROVIDER_ID,
					mode: currentMode,
					modelId: paidModelId,
				}),
			)

			await handleModeFieldsChange(
				{
					apiProvider: {
						plan: "planModeApiProvider",
						act: "actModeApiProvider",
					},
					hadyancodeModelId: {
						plan: "planModeHadyanCodeModelId",
						act: "actModeHadyanCodeModelId",
					},
					hadyancodeModelInfo: {
						plan: "planModeHadyanCodeModelInfo",
						act: "actModeHadyanCodeModelInfo",
					},
				},
				{
					apiProvider: HADYANCODE_PROVIDER_ID,
					hadyancodeModelId: paidModelId,
					hadyancodeModelInfo: modelInfo,
				},
				currentMode,
			)
			setDidSwitch(true)
		} catch (error) {
			console.error("Failed to switch to the paid model:", error)
			setSwitchError(`Failed to switch model. Select ${paidModelId} in API Configuration settings.`)
		} finally {
			setIsSwitching(false)
		}
	}

	return (
		<div
			className="p-2 border-none rounded-md mb-2 bg-(--vscode-textBlockQuote-background)"
			data-testid="hadyancode-free-model-limit-error">
			<div className="text-error mb-2">Daily free model limit reached</div>
			<div className="text-(--vscode-descriptionForeground) text-xs wrap-anywhere">
				You've reached today's free usage limit for this model.
			</div>
			<div className="text-(--vscode-descriptionForeground) text-xs mt-2">
				{resetTime ? `Try again in ${resetTime}` : "Try again later"} or select another model.
			</div>
			{paidModelId && (
				<>
					<div className="text-(--vscode-descriptionForeground) text-xs mt-2 wrap-anywhere">
						Or switch to the paid version of this model ({paidModelId}) with usage-based billing.
					</div>
					<VSCodeButton
						appearance="primary"
						className="w-full mt-3"
						disabled={isSwitching || didSwitch}
						onClick={handleSwitchToPaidModel}>
						{isSwitching
							? "Switching..."
							: didSwitch
								? "Switched to Usage-Based billing"
								: "Switch to Usage-Based billing"}
					</VSCodeButton>
					{didSwitch && (
						<div className="text-(--vscode-descriptionForeground) text-xs mt-2">
							Retry the request after switching.
						</div>
					)}
					{switchError && <div className="text-error text-xs mt-2">{switchError}</div>}
				</>
			)}
		</div>
	)
}

export default HadyanCodeFreeModelLimitError
