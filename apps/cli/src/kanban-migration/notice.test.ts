import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	getHadyanCodeCliMigrationNotice,
	markHadyanCodeCliMigrationNoticeShown,
	resolveCliNoticeStatePath,
	shouldSuppressHadyanCodeCliMigrationNoticeForActiveProvider,
} from "./notice";

const tempDirs: string[] = [];

function createTempDataDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "hadyancode-cli-notice-"));
	tempDirs.push(dir);
	return dir;
}

describe("migration notice", () => {
	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("returns the notice for a fresh data dir", () => {
		const dataDir = createTempDataDir();

		expect(getHadyanCodeCliMigrationNotice(dataDir)?.title).toBe("Try HadyanCodePass");
	});

	it("shows when only the old Kanban notice was marked as shown", () => {
		const dataDir = createTempDataDir();
		const noticePath = resolveCliNoticeStatePath(dataDir);
		mkdirSync(dirname(noticePath), { recursive: true, mode: 0o700 });
		writeFileSync(
			noticePath,
			`${JSON.stringify(
				{ shown: { "hadyancode-cli-tui-default": true } },
				null,
				2,
			)}\n`,
			"utf8",
		);

		expect(getHadyanCodeCliMigrationNotice(dataDir)?.id).toBe(
			"hadyancode-cli-hadyancode-pass-intro",
		);
	});

	it("does not show after the notice is marked as shown", () => {
		const dataDir = createTempDataDir();

		markHadyanCodeCliMigrationNoticeShown(dataDir);

		expect(getHadyanCodeCliMigrationNotice(dataDir)).toBeUndefined();
	});

	it("shows after the notice is marked as shown when forced", () => {
		const dataDir = createTempDataDir();

		markHadyanCodeCliMigrationNoticeShown(dataDir);

		expect(
			getHadyanCodeCliMigrationNotice(dataDir, {
				HADYANCODE_FORCE_HADYANCODE_PASS_NOTICE: "1",
			}),
		).toBeDefined();
	});

	it("does not show when disabled through the environment", () => {
		const dataDir = createTempDataDir();

		expect(
			getHadyanCodeCliMigrationNotice(dataDir, {
				HADYANCODE_DISABLE_HADYANCODE_PASS_NOTICE: "1",
			}),
		).toBeUndefined();
	});

	it("does not show when HadyanCodePass is already the active provider", () => {
		const dataDir = createTempDataDir();

		expect(
			getHadyanCodeCliMigrationNotice(
				dataDir,
				{},
				{ activeProviderId: "hadyancode-pass" },
			),
		).toBeUndefined();
	});

	it("suppresses the active HadyanCodePass provider even when the provider id has surrounding whitespace", () => {
		expect(
			shouldSuppressHadyanCodeCliMigrationNoticeForActiveProvider(" hadyancode-pass "),
		).toBe(true);
	});

	it("does not suppress the active HadyanCodePass provider when forced", () => {
		expect(
			shouldSuppressHadyanCodeCliMigrationNoticeForActiveProvider("hadyancode-pass", {
				HADYANCODE_FORCE_HADYANCODE_PASS_NOTICE: "1",
			}),
		).toBe(false);
	});

	it("shows for the active HadyanCodePass provider when forced", () => {
		const dataDir = createTempDataDir();

		expect(
			getHadyanCodeCliMigrationNotice(
				dataDir,
				{ HADYANCODE_FORCE_HADYANCODE_PASS_NOTICE: "1" },
				{ activeProviderId: "hadyancode-pass" },
			),
		).toBeDefined();
	});

	it("shows when forced even if disabled through the environment", () => {
		const dataDir = createTempDataDir();

		expect(
			getHadyanCodeCliMigrationNotice(dataDir, {
				HADYANCODE_DISABLE_HADYANCODE_PASS_NOTICE: "1",
				HADYANCODE_FORCE_HADYANCODE_PASS_NOTICE: "1",
			}),
		).toBeDefined();
	});

	it("marks the notice as shown", () => {
		const dataDir = createTempDataDir();

		markHadyanCodeCliMigrationNoticeShown(dataDir);

		const rawState = readFileSync(resolveCliNoticeStatePath(dataDir), "utf8");
		expect(rawState).toContain("hadyancode-cli-hadyancode-pass-intro");
		expect(getHadyanCodeCliMigrationNotice(dataDir)).toBeUndefined();
	});
});
