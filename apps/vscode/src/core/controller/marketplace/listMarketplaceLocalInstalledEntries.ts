import type { EmptyRequest } from "@shared/proto/hadyancode/common"
import type { MarketplaceLocalInstalledEntries } from "@shared/proto/hadyancode/marketplace"
import type { Controller } from "../index"
import { listLocalMarketplaceInstalledEntries } from "./marketplace-helpers"

export async function listMarketplaceLocalInstalledEntries(
	controller: Controller,
	_request: EmptyRequest,
): Promise<MarketplaceLocalInstalledEntries> {
	return listLocalMarketplaceInstalledEntries(controller)
}
