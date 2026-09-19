import { credentials } from "@grpc/grpc-js"
import { AccountServiceClient } from "@hadyancode-grpc/account"
import { BrowserServiceClient } from "@hadyancode-grpc/browser"
import { CheckpointsServiceClient } from "@hadyancode-grpc/checkpoints"
import { CommandsServiceClient } from "@hadyancode-grpc/commands"
import { FileServiceClient } from "@hadyancode-grpc/file"
import { McpServiceClient } from "@hadyancode-grpc/mcp"
import { ModelsServiceClient } from "@hadyancode-grpc/models"
import { SlashServiceClient } from "@hadyancode-grpc/slash"
import { StateServiceClient } from "@hadyancode-grpc/state"
import { TaskServiceClient } from "@hadyancode-grpc/task"
import { UiServiceClient } from "@hadyancode-grpc/ui"
import { WebServiceClient } from "@hadyancode-grpc/web"
import { promisify } from "util"

const serviceRegistry = {
	"hadyancode.AccountService": AccountServiceClient,
	"hadyancode.BrowserService": BrowserServiceClient,
	"hadyancode.CheckpointsService": CheckpointsServiceClient,
	"hadyancode.CommandsService": CommandsServiceClient,
	"hadyancode.FileService": FileServiceClient,
	"hadyancode.McpService": McpServiceClient,
	"hadyancode.ModelsService": ModelsServiceClient,
	"hadyancode.SlashService": SlashServiceClient,
	"hadyancode.StateService": StateServiceClient,
	"hadyancode.TaskService": TaskServiceClient,
	"hadyancode.UiService": UiServiceClient,
	"hadyancode.WebService": WebServiceClient,
} as const

export type ServiceClients = {
	-readonly [K in keyof typeof serviceRegistry]: InstanceType<(typeof serviceRegistry)[K]>
}

export class GrpcAdapter {
	private clients: Partial<ServiceClients> = {}

	constructor(address: string) {
		for (const [name, Client] of Object.entries(serviceRegistry)) {
			this.clients[name as keyof ServiceClients] = new (Client as any)(address, credentials.createInsecure())
		}
	}

	async call(service: keyof ServiceClients, method: string, request: any): Promise<any> {
		const client = this.clients[service]
		if (!client) {
			throw new Error(`No gRPC client registered for service: ${String(service)}`)
		}

		const fn = (client as any)[method]
		if (typeof fn !== "function") {
			throw new Error(`Method ${method} not found on service ${String(service)}`)
		}

		try {
			const fnAsync = promisify(fn).bind(client)
			const response = await fnAsync(request.message)
			return response?.toObject ? response.toObject() : response
		} catch (error) {
			console.error(`[GrpcAdapter] ${service}.${method} failed:`, error)
			throw error
		}
	}

	close(): void {
		for (const client of Object.values(this.clients)) {
			if (client && typeof (client as any).close === "function") {
				;(client as any).close()
			}
		}
	}
}
