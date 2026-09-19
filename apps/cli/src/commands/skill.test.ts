import { describe, expect, it } from "vitest";
import { buildSkillsArgs } from "./skill";

describe("buildSkillsArgs", () => {
	it("runs the skills package through npx with -y", () => {
		expect(buildSkillsArgs(["list"])).toEqual(["-y", "skills@latest", "list"]);
	});

	it("injects --agent hadyancode for install-style subcommands", () => {
		expect(buildSkillsArgs(["install", "owner/repo"])).toEqual([
			"-y",
			"skills@latest",
			"add",
			"owner/repo",
			"--agent",
			"hadyancode",
		]);
		expect(buildSkillsArgs(["add", "owner/repo"])).toContain("hadyancode");
		expect(buildSkillsArgs(["i", "owner/repo"])).toContain("hadyancode");
		expect(buildSkillsArgs(["update", "owner/repo"])).toContain("hadyancode");
	});

	it("aliases uninstall to the skills remove subcommand", () => {
		expect(buildSkillsArgs(["uninstall", "my-skill"])).toEqual([
			"-y",
			"skills@latest",
			"remove",
			"my-skill",
			"--agent",
			"hadyancode",
		]);
	});

	it("does not inject when the user already targeted an agent", () => {
		expect(
			buildSkillsArgs(["install", "owner/repo", "--agent", "cursor"]),
		).not.toContain("hadyancode");
		expect(
			buildSkillsArgs(["install", "owner/repo", "-a", "cursor"]),
		).not.toContain("hadyancode");
		expect(
			buildSkillsArgs(["install", "owner/repo", "--agent=cursor"]),
		).not.toContain("hadyancode");
	});

	it("aliases install and uninstall when agent options come before the subcommand", () => {
		expect(
			buildSkillsArgs(["--agent", "cursor", "install", "owner/repo"]),
		).toEqual([
			"-y",
			"skills@latest",
			"--agent",
			"cursor",
			"add",
			"owner/repo",
		]);
		expect(
			buildSkillsArgs(["--agent=cursor", "uninstall", "my-skill"]),
		).toEqual(["-y", "skills@latest", "--agent=cursor", "remove", "my-skill"]);
	});

	it("does not scope non-install subcommands to hadyancode", () => {
		expect(buildSkillsArgs(["use", "owner/repo"])).not.toContain("--agent");
		expect(buildSkillsArgs(["list"])).not.toContain("--agent");
	});

	it("scopes remove-style subcommands to hadyancode", () => {
		expect(buildSkillsArgs(["remove"])).toEqual([
			"-y",
			"skills@latest",
			"remove",
			"--agent",
			"hadyancode",
		]);
		expect(buildSkillsArgs(["rm", "my-skill"])).toContain("hadyancode");
		expect(buildSkillsArgs(["r", "my-skill"])).toContain("hadyancode");
	});

	it("ignores leading flags when detecting the subcommand", () => {
		expect(buildSkillsArgs(["--global", "install", "owner/repo"])).toContain(
			"hadyancode",
		);
	});

	it("forwards an empty arg list unchanged", () => {
		expect(buildSkillsArgs([])).toEqual(["-y", "skills@latest"]);
	});
});
