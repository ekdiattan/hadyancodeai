import { Mode } from "@shared/storage/types"
import { HadyanCodeAccountInfoCard } from "../HadyanCodeAccountInfoCard"
import HadyanCodeModelPicker from "../HadyanCodeModelPicker"

/**
 * Props for the HadyanCodeProvider component
 */
interface HadyanCodeProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
	initialModelTab?: "recommended" | "free"
}

/**
 * The HadyanCode provider configuration component
 */
export const HadyanCodeProvider = ({ showModelOptions, isPopup, currentMode, initialModelTab }: HadyanCodeProviderProps) => {
	return (
		<div>
			{/* HadyanCode Account Info Card */}
			<div style={{ marginBottom: 14, marginTop: 4 }}>
				<HadyanCodeAccountInfoCard />
			</div>

			{showModelOptions && (
				<HadyanCodeModelPicker
					currentMode={currentMode}
					initialTab={initialModelTab}
					isPopup={isPopup}
					showProviderRouting={true}
				/>
			)}
		</div>
	)
}
