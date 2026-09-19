import { CheckpointRestoreRequest } from "@shared/proto/hadyancode/checkpoints"
import { Empty } from "@shared/proto/hadyancode/common"
import { HadyanCodeCheckpointRestore } from "../../../shared/WebviewMessage"
import { Controller } from ".."

export async function checkpointRestore(controller: Controller, request: CheckpointRestoreRequest): Promise<Empty> {
	const sdkRestoreCheckpoint = (
		controller as Controller & {
			restoreCheckpoint?: (input: { checkpointRunCount: number; restoreType: HadyanCodeCheckpointRestore }) => Promise<void>
		}
	).restoreCheckpoint
	if (sdkRestoreCheckpoint) {
		if (request.number) {
			await sdkRestoreCheckpoint.call(controller, {
				checkpointRunCount: Number(request.number),
				restoreType: request.restoreType as HadyanCodeCheckpointRestore,
			})
		}
		return Empty.create({})
	}

	return Empty.create({})
}
