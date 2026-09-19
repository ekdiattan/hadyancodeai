import { synchronizeRuleToggles } from "@core/context/instructions/user-instructions/rule-helpers"
import { ensureRulesDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { HadyanCodeRulesToggles } from "@shared/hadyancode-rules"
import path from "path"
import { Controller } from "@/core/controller"

export async function refreshHadyanCodeRulesToggles(
	controller: Controller,
	workingDirectory: string,
): Promise<{
	globalToggles: HadyanCodeRulesToggles
	localToggles: HadyanCodeRulesToggles
}> {
	// Global toggles
	const globalHadyanCodeRulesToggles = controller.stateManager.getGlobalSettingsKey("globalHadyanCodeRulesToggles")
	const globalHadyanCodeRulesFilePath = await ensureRulesDirectoryExists()
	const updatedGlobalToggles = await synchronizeRuleToggles(globalHadyanCodeRulesFilePath, globalHadyanCodeRulesToggles)
	controller.stateManager.setGlobalState("globalHadyanCodeRulesToggles", updatedGlobalToggles)

	// Local toggles
	const localHadyanCodeRulesToggles = controller.stateManager.getWorkspaceStateKey("localHadyanCodeRulesToggles")
	const localHadyanCodeRulesFilePath = path.resolve(workingDirectory, GlobalFileNames.hadyancodeRules)
	const updatedLocalToggles = await synchronizeRuleToggles(localHadyanCodeRulesFilePath, localHadyanCodeRulesToggles, "", [
		[".hadyancoderules", "workflows"],
		[".hadyancoderules", "hooks"],
		[".hadyancoderules", "skills"],
	])
	controller.stateManager.setWorkspaceState("localHadyanCodeRulesToggles", updatedLocalToggles)

	return {
		globalToggles: updatedGlobalToggles,
		localToggles: updatedLocalToggles,
	}
}
