import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createProfile,
  expandTargetPath,
  getState,
  initApp,
  readProfile,
  saveCurrentAsProfile,
  useProfile,
  validateName,
  writeProfile
} from "../src/lib/profile-store";

let tempDir = "";
let targetDir = "";
let originalConfigDir: string | undefined;

beforeEach(async () => {
  originalConfigDir = process.env.SWITCHYARD_CONFIG_DIR;
  tempDir = await mkdtemp(path.join(os.tmpdir(), "switchyard-test-"));
  targetDir = await mkdtemp(path.join(os.tmpdir(), "switchyard-target-"));
  process.env.SWITCHYARD_CONFIG_DIR = tempDir;
});

afterEach(async () => {
  if (originalConfigDir === undefined) {
    delete process.env.SWITCHYARD_CONFIG_DIR;
  } else {
    process.env.SWITCHYARD_CONFIG_DIR = originalConfigDir;
  }
  await rm(tempDir, { recursive: true, force: true });
  await rm(targetDir, { recursive: true, force: true });
});

describe("profile store", () => {
  it("initializes an app and lists it", async () => {
    const target = path.join(targetDir, "auth.json");
    await initApp("codex", target);

    const state = await getState();

    expect(state.configDir).toBe(tempDir);
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0].name).toBe("codex");
    expect(state.apps[0].target).toBe(target);
    expect(state.apps[0].status).toBe("target-missing");
  });

  it("saves current target content as a profile and detects active status", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "{\"token\":\"secret-value\"}", "utf8");
    await initApp("codex", target);

    await saveCurrentAsProfile("codex", "work");
    const state = await getState();

    expect(state.apps[0].profiles[0].name).toBe("work");
    expect(state.apps[0].profiles[0].active).toBe(true);
    expect(state.apps[0].status).toBe("in-sync");
  });

  it("switches to a profile and creates a backup when requested", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "current", "utf8");
    await initApp("codex", target);
    await createProfile("codex", "personal");
    await writeProfile("codex", "personal", "profile-content");

    await useProfile("codex", "personal", true);

    await expect(readFile(target, "utf8")).resolves.toBe("profile-content");
    const state = await getState();
    expect(state.apps[0].profiles.some((profile) => profile.name.startsWith("backup-"))).toBe(true);
  });

  it("rejects unsafe profile and app names", () => {
    expect(() => validateName("work")).not.toThrow();
    expect(() => validateName("client-acme_1.2")).not.toThrow();
    expect(() => validateName("../secret")).toThrow();
    expect(() => validateName("nested/path")).toThrow();
  });

  it("expands tilde and environment variables without shell eval", () => {
    process.env.SWITCHYARD_TEST_FILE = "example.json";
    expect(expandTargetPath("~/demo")).toBe(path.join(os.homedir(), "demo"));
    expect(expandTargetPath("$SWITCHYARD_TEST_FILE")).toBe(path.resolve("example.json"));
  });

  it("edits a profile as text", async () => {
    const target = path.join(targetDir, "config.yml");
    await initApp("gh", target);
    await createProfile("gh", "main");
    await writeProfile("gh", "main", "github.com:\n  user: dev");

    await expect(readProfile("gh", "main")).resolves.toContain("github.com");
  });
});
