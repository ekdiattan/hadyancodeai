import { describe, expect, it } from "bun:test";
import { setPackageVersion } from "./set-version.mjs";

const fixture = JSON.stringify(
	{
		name: "claude-dev",
		displayName: "HadyanCode",
		publisher: "saoudrizwan",
		version: "4.0.0",
		contributes: {
			commands: [{ command: "hadyancode.plusButtonClicked", title: "New Task" }],
		},
	},
	null,
	"\t",
);

describe("setPackageVersion", () => {
	it("stamps the version and touches nothing else", () => {
		const pkg = JSON.parse(setPackageVersion(fixture, "4.1.0"));
		expect(pkg.version).toBe("4.1.0");
		expect(pkg.name).toBe("claude-dev");
		expect(pkg.displayName).toBe("HadyanCode");
		expect(pkg.publisher).toBe("saoudrizwan");
		expect(pkg.contributes.commands[0].command).toBe(
			"hadyancode.plusButtonClicked",
		);
	});

	it("requires a version", () => {
		expect(() => setPackageVersion(fixture, undefined)).toThrow(/version/);
		expect(() => setPackageVersion(fixture, "")).toThrow(/version/);
	});
});
