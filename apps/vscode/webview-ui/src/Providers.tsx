import { HeroUIProvider } from "@heroui/react"
import { type ReactNode } from "react"
import { CustomPostHogProvider } from "./CustomPostHogProvider"
import { ExtensionStateContextProvider } from "./context/ExtensionStateContext"
import { HadyanCodeAuthProvider } from "./context/HadyanCodeAuthContext"
import { PlatformProvider } from "./context/PlatformContext"

export function Providers({ children }: { children: ReactNode }) {
	return (
		<PlatformProvider>
			<ExtensionStateContextProvider>
				<CustomPostHogProvider>
					<HadyanCodeAuthProvider>
						<HeroUIProvider>{children}</HeroUIProvider>
					</HadyanCodeAuthProvider>
				</CustomPostHogProvider>
			</ExtensionStateContextProvider>
		</PlatformProvider>
	)
}
