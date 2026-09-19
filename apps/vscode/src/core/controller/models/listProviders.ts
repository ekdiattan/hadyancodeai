import { Empty } from "@/shared/proto/hadyancode/common"
import { ProviderListingsResponse } from "@/shared/proto/hadyancode/models"
import { type ProviderCatalogController, toProviderListingProto } from "./providerCatalogShared"

export async function listProviders(controller: ProviderCatalogController, _request: Empty): Promise<ProviderListingsResponse> {
	const providers = await controller.getProviderCatalog().listProviders()
	return ProviderListingsResponse.create({
		providers: providers.map(toProviderListingProto),
	})
}
