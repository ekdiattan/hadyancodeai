// Under vitest, `@hadyancode/core` is aliased to src/test/hadyancode-core-vitest-stub.ts
// (see vitest.config.ts), which holds models.json state in memory and exposes
// the stub-only `resetModelsFileState` — hence the cast below.
import * as HadyanCodeCore from "@hadyancode/core"
import { resetRegistry } from "@hadyancode/llms"
import { beforeEach } from "vitest"

const { resetModelsFileState } = HadyanCodeCore as typeof HadyanCodeCore & { resetModelsFileState(): void }

beforeEach(() => {
	resetModelsFileState()
	// The stub's syncStoredProviderRegistration mutates the real shared
	// @hadyancode/llms registry; reset it so registrations never leak across tests.
	resetRegistry()
})
