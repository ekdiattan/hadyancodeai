import { Boolean } from "@shared/proto/hadyancode/common"
import { isHadyanCodeCliInstalled } from "@/utils/cli-detector"
import { Controller } from ".."

/**
 * Check if the HadyanCode CLI is installed
 * @param controller The controller instance
 * @returns Boolean indicating if CLI is installed
 */
export async function checkCliInstallation(_controller: Controller): Promise<Boolean> {
	try {
		const isInstalled = await isHadyanCodeCliInstalled()
		return Boolean.create({ value: isInstalled })
	} catch {
		return Boolean.create({ value: false })
	}
}
