import type { HadyanCodeCore } from "@hadyancode/core";
import type { MessageWithMetadata } from "@hadyancode/shared";

export async function loadInteractiveResumeMessages(
	sessionManager: HadyanCodeCore,
	resumeSessionId?: string,
): Promise<MessageWithMetadata[] | undefined> {
	const target = resumeSessionId?.trim();
	if (!target) {
		return undefined;
	}
	return await sessionManager.readMessages(target);
}
