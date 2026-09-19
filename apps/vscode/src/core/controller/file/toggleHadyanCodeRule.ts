import { getWorkspaceBasename } from "@core/workspace"
import type { ToggleHadyanCodeRuleRequest } from "@shared/proto/hadyancode/file"
import { RuleScope, ToggleHadyanCodeRules } from "@shared/proto/hadyancode/file"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

/**
 * Toggles a HadyanCode rule (enable or disable)
 * @param controller The controller instance
 * @param request The toggle request
 * @returns The updated HadyanCode rule toggles
 */
export async function toggleHadyanCodeRule(
	controller: Controller,
	request: ToggleHadyanCodeRuleRequest,
): Promise<ToggleHadyanCodeRules> {
	const { scope, rulePath, enabled } = request

	if (!rulePath || typeof enabled !== "boolean" || scope === undefined) {
		Logger.error("toggleHadyanCodeRule: Missing or invalid parameters", {
			rulePath,
			scope,
			enabled: typeof enabled === "boolean" ? enabled : `Invalid: ${typeof enabled}`,
		})
		throw new Error("Missing or invalid parameters for toggleHadyanCodeRule")
	}

	// Handle the three different scopes
	switch (scope) {
		case RuleScope.GLOBAL: {
			const toggles = controller.stateManager.getGlobalSettingsKey("globalHadyanCodeRulesToggles")
			toggles[rulePath] = enabled
			controller.stateManager.setGlobalState("globalHadyanCodeRulesToggles", toggles)
			break
		}
		case RuleScope.LOCAL: {
			const toggles = controller.stateManager.getWorkspaceStateKey("localHadyanCodeRulesToggles")
			toggles[rulePath] = enabled
			controller.stateManager.setWorkspaceState("localHadyanCodeRulesToggles", toggles)
			break
		}
		case RuleScope.REMOTE: {
			const toggles = controller.stateManager.getGlobalStateKey("remoteRulesToggles")
			toggles[rulePath] = enabled
			controller.stateManager.setGlobalState("remoteRulesToggles", toggles)
			break
		}
		default:
			throw new Error(`Invalid scope: ${scope}`)
	}

	// Track rule toggle telemetry with current task context
	if (controller.task?.ulid) {
		// Extract just the filename for privacy (no full paths)
		const ruleFileName = getWorkspaceBasename(rulePath, "Controller.toggleHadyanCodeRule")
		const isGlobal = scope === RuleScope.GLOBAL
		telemetryService.captureHadyanCodeRuleToggled(controller.task.ulid, ruleFileName, enabled, isGlobal)
	}

	// Get the current state to return in the response
	const globalToggles = controller.stateManager.getGlobalSettingsKey("globalHadyanCodeRulesToggles")
	const localToggles = controller.stateManager.getWorkspaceStateKey("localHadyanCodeRulesToggles")
	const remoteToggles = controller.stateManager.getGlobalStateKey("remoteRulesToggles")

	return ToggleHadyanCodeRules.create({
		globalHadyanCodeRulesToggles: { toggles: globalToggles },
		localHadyanCodeRulesToggles: { toggles: localToggles },
		remoteRulesToggles: { toggles: remoteToggles },
	})
}
