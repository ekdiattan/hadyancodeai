import { refreshExternalRulesToggles } from "@core/context/instructions/user-instructions/external-rules"
import { refreshHadyanCodeRulesToggles } from "@core/context/instructions/user-instructions/hadyancode-rules"
import { refreshWorkflowToggles } from "@core/context/instructions/user-instructions/workflows"
import { EmptyRequest } from "@shared/proto/hadyancode/common"
import { RefreshedRules } from "@shared/proto/hadyancode/file"
import { Logger } from "@/shared/services/Logger"
import { getCwd, getDesktopDir } from "@/utils/path"
import type { Controller } from "../index"

/**
 * Refreshes all rule toggles (HadyanCode, External, and Workflows)
 * @param controller The controller instance
 * @param _request The empty request
 * @returns RefreshedRules containing updated toggles for all rule types
 */
export async function refreshRules(controller: Controller, _request: EmptyRequest): Promise<RefreshedRules> {
	try {
		const cwd = await getCwd(getDesktopDir())
		const { globalToggles, localToggles } = await refreshHadyanCodeRulesToggles(controller, cwd)
		const { cursorLocalToggles, windsurfLocalToggles, agentsLocalToggles } = await refreshExternalRulesToggles(
			controller,
			cwd,
		)
		const { localWorkflowToggles, globalWorkflowToggles } = await refreshWorkflowToggles(controller, cwd)

		return RefreshedRules.create({
			globalHadyanCodeRulesToggles: { toggles: globalToggles },
			localHadyanCodeRulesToggles: { toggles: localToggles },
			localCursorRulesToggles: { toggles: cursorLocalToggles },
			localWindsurfRulesToggles: { toggles: windsurfLocalToggles },
			localAgentsRulesToggles: { toggles: agentsLocalToggles },
			localWorkflowToggles: { toggles: localWorkflowToggles },
			globalWorkflowToggles: { toggles: globalWorkflowToggles },
		})
	} catch (error) {
		Logger.error("Failed to refresh rules:", error)
		throw error
	}
}
