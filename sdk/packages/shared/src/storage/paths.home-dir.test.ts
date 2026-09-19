import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

type EnvSnapshot = {
	HOME: string | undefined;
	USERPROFILE: string | undefined;
	HOMEDRIVE: string | undefined;
	HOMEPATH: string | undefined;
	HADYANCODE_DIR: string | undefined;
};

function captureEnv(): EnvSnapshot {
	return {
		HOME: process.env.HOME,
		USERPROFILE: process.env.USERPROFILE,
		HOMEDRIVE: process.env.HOMEDRIVE,
		HOMEPATH: process.env.HOMEPATH,
		HADYANCODE_DIR: process.env.HADYANCODE_DIR,
	};
}

function restoreEnv(snapshot: EnvSnapshot): void {
	process.env.HOME = snapshot.HOME;
	process.env.USERPROFILE = snapshot.USERPROFILE;
	process.env.HOMEDRIVE = snapshot.HOMEDRIVE;
	process.env.HOMEPATH = snapshot.HOMEPATH;
	process.env.HADYANCODE_DIR = snapshot.HADYANCODE_DIR;
}

describe("storage home directory fallback", () => {
	let snapshot: EnvSnapshot = captureEnv();

	afterEach(() => {
		restoreEnv(snapshot);
		vi.resetModules();
	});

	it("uses USERPROFILE when HOME is unset", async () => {
		snapshot = captureEnv();
		delete process.env.HOME;
		process.env.USERPROFILE = "C:\\Users\\saoud";
		delete process.env.HOMEDRIVE;
		delete process.env.HOMEPATH;
		delete process.env.HADYANCODE_DIR;

		const { resolveHadyanCodeDir } = await import("./paths");
		expect(resolveHadyanCodeDir()).toBe(join("C:\\Users\\saoud", ".hadyancode"));
	});

	it("treats HOME=~ as unset and falls back to USERPROFILE", async () => {
		snapshot = captureEnv();
		process.env.HOME = "~";
		process.env.USERPROFILE = "C:\\Users\\saoud";
		delete process.env.HOMEDRIVE;
		delete process.env.HOMEPATH;
		delete process.env.HADYANCODE_DIR;

		const { resolveHadyanCodeDir } = await import("./paths");
		expect(resolveHadyanCodeDir()).toBe(join("C:\\Users\\saoud", ".hadyancode"));
	});
});
