import type {
	HadyanCodeAccountActionRequest,
	ProviderActionRequest,
} from "@hadyancode/shared";
import type {
	HadyanCodeAccountBalance,
	HadyanCodeAccountOrganization,
	HadyanCodeAccountOrganizationBalance,
	HadyanCodeAccountOrganizationUsageTransaction,
	HadyanCodeAccountPaymentTransaction,
	HadyanCodeAccountUsageTransaction,
	HadyanCodeAccountUser,
	FeaturebaseTokenResponse,
} from "./types";

export interface HadyanCodeAccountOperations {
	fetchMe(): Promise<HadyanCodeAccountUser>;
	fetchBalance(userId?: string): Promise<HadyanCodeAccountBalance>;
	fetchUsageTransactions(
		userId?: string,
	): Promise<HadyanCodeAccountUsageTransaction[]>;
	fetchPaymentTransactions(
		userId?: string,
	): Promise<HadyanCodeAccountPaymentTransaction[]>;
	fetchUserOrganizations(): Promise<HadyanCodeAccountOrganization[]>;
	fetchOrganizationBalance(
		organizationId: string,
	): Promise<HadyanCodeAccountOrganizationBalance>;
	fetchOrganizationUsageTransactions(input: {
		organizationId: string;
		memberId?: string;
	}): Promise<HadyanCodeAccountOrganizationUsageTransaction[]>;
	switchAccount(organizationId?: string | null): Promise<void>;
	fetchFeaturebaseToken?(): Promise<FeaturebaseTokenResponse | undefined>;
}

export function isHadyanCodeAccountActionRequest(
	request: ProviderActionRequest,
): request is HadyanCodeAccountActionRequest {
	return request.action === "hadyancodeAccount";
}

export async function executeHadyanCodeAccountAction(
	request: HadyanCodeAccountActionRequest,
	service: HadyanCodeAccountOperations,
): Promise<unknown> {
	switch (request.operation) {
		case "fetchMe":
			return service.fetchMe();
		case "fetchBalance":
			return service.fetchBalance(request.userId);
		case "fetchUsageTransactions":
			return service.fetchUsageTransactions(request.userId);
		case "fetchPaymentTransactions":
			return service.fetchPaymentTransactions(request.userId);
		case "fetchUserOrganizations":
			return service.fetchUserOrganizations();
		case "fetchOrganizationBalance":
			return service.fetchOrganizationBalance(request.organizationId);
		case "fetchOrganizationUsageTransactions":
			return service.fetchOrganizationUsageTransactions({
				organizationId: request.organizationId,
				memberId: request.memberId,
			});
		case "switchAccount":
			await service.switchAccount(request.organizationId);
			return { updated: true };
		case "fetchFeaturebaseToken":
			return service.fetchFeaturebaseToken?.();
		default: {
			const exhaustive: never = request;
			throw new Error(
				`Unsupported HadyanCode account operation: ${String(exhaustive)}`,
			);
		}
	}
}

export interface ProviderActionExecutor {
	runProviderAction(request: ProviderActionRequest): Promise<{
		result: unknown;
	}>;
}

export class RpcHadyanCodeAccountService implements HadyanCodeAccountOperations {
	private readonly executor: ProviderActionExecutor;

	constructor(executor: ProviderActionExecutor) {
		this.executor = executor;
	}

	public async fetchMe(): Promise<HadyanCodeAccountUser> {
		return this.request<HadyanCodeAccountUser>({
			action: "hadyancodeAccount",
			operation: "fetchMe",
		});
	}

	public async fetchBalance(userId?: string): Promise<HadyanCodeAccountBalance> {
		return this.request<HadyanCodeAccountBalance>({
			action: "hadyancodeAccount",
			operation: "fetchBalance",
			...(userId?.trim() ? { userId: userId.trim() } : {}),
		});
	}

	public async fetchUsageTransactions(
		userId?: string,
	): Promise<HadyanCodeAccountUsageTransaction[]> {
		return this.request<HadyanCodeAccountUsageTransaction[]>({
			action: "hadyancodeAccount",
			operation: "fetchUsageTransactions",
			...(userId?.trim() ? { userId: userId.trim() } : {}),
		});
	}

	public async fetchPaymentTransactions(
		userId?: string,
	): Promise<HadyanCodeAccountPaymentTransaction[]> {
		return this.request<HadyanCodeAccountPaymentTransaction[]>({
			action: "hadyancodeAccount",
			operation: "fetchPaymentTransactions",
			...(userId?.trim() ? { userId: userId.trim() } : {}),
		});
	}

	public async fetchUserOrganizations(): Promise<HadyanCodeAccountOrganization[]> {
		return this.request<HadyanCodeAccountOrganization[]>({
			action: "hadyancodeAccount",
			operation: "fetchUserOrganizations",
		});
	}

	public async fetchOrganizationBalance(
		organizationId: string,
	): Promise<HadyanCodeAccountOrganizationBalance> {
		const orgId = organizationId.trim();
		if (!orgId) {
			throw new Error("organizationId is required");
		}
		return this.request<HadyanCodeAccountOrganizationBalance>({
			action: "hadyancodeAccount",
			operation: "fetchOrganizationBalance",
			organizationId: orgId,
		});
	}

	public async fetchOrganizationUsageTransactions(input: {
		organizationId: string;
		memberId?: string;
	}): Promise<HadyanCodeAccountOrganizationUsageTransaction[]> {
		const orgId = input.organizationId.trim();
		if (!orgId) {
			throw new Error("organizationId is required");
		}
		return this.request<HadyanCodeAccountOrganizationUsageTransaction[]>({
			action: "hadyancodeAccount",
			operation: "fetchOrganizationUsageTransactions",
			organizationId: orgId,
			...(input.memberId?.trim() ? { memberId: input.memberId.trim() } : {}),
		});
	}

	public async switchAccount(organizationId?: string | null): Promise<void> {
		await this.request<{ updated: boolean }>({
			action: "hadyancodeAccount",
			operation: "switchAccount",
			organizationId: organizationId?.trim() || null,
		});
	}

	public async fetchFeaturebaseToken(): Promise<
		FeaturebaseTokenResponse | undefined
	> {
		return this.request<FeaturebaseTokenResponse | undefined>({
			action: "hadyancodeAccount",
			operation: "fetchFeaturebaseToken",
		});
	}

	private async request<T>(request: HadyanCodeAccountActionRequest): Promise<T> {
		const response = await this.executor.runProviderAction(request);
		return response.result as T;
	}
}
