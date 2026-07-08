import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearActiveProfile,
  createProfile,
  deleteProfile,
  expandTargetPath,
  getState,
  initApp,
  readProfile,
  renameProfile,
  removeApp,
  saveCurrentAsProfile,
  updateApp,
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

  it("updates an app target path without removing profiles", async () => {
    const firstTarget = path.join(targetDir, "auth.json");
    const nextTarget = path.join(targetDir, "auth-next.json");
    await initApp("codex", firstTarget);
    await createProfile("codex", "work");
    await writeProfile("codex", "work", "profile-content");

    await updateApp("codex", "codex", nextTarget);

    const state = await getState();
    expect(state.apps[0].name).toBe("codex");
    expect(state.apps[0].target).toBe(nextTarget);
    expect(state.apps[0].profiles.map((profile) => profile.name)).toEqual(["work"]);
    await expect(readProfile("codex", "work")).resolves.toBe("profile-content");
  });

  it("renames an app and keeps its target and profiles", async () => {
    const target = path.join(targetDir, "auth.json");
    await initApp("codex", target);
    await createProfile("codex", "work");
    await writeProfile("codex", "work", "profile-content");

    await updateApp("codex", "claude", target);

    const state = await getState();
    expect(state.apps.map((app) => app.name)).toEqual(["claude"]);
    expect(state.apps[0].target).toBe(target);
    await expect(readProfile("claude", "work")).resolves.toBe("profile-content");
    await expect(readProfile("codex", "work")).rejects.toThrow();
  });

  it("does not rename an app over another app", async () => {
    await initApp("codex", path.join(targetDir, "codex.json"));
    await initApp("claude", path.join(targetDir, "claude.json"));

    await expect(updateApp("codex", "claude", path.join(targetDir, "next.json"))).rejects.toThrow("already exists");
  });

  it("removes an app without touching the target file", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "current-target", "utf8");
    await initApp("codex", target);
    await createProfile("codex", "work");

    await removeApp("codex");

    await expect(readFile(target, "utf8")).resolves.toBe("current-target");
    const state = await getState();
    expect(state.apps).toEqual([]);
  });

  it("switches to a profile without creating a duplicate backup for named target content", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "work-content", "utf8");
    await initApp("codex", target);
    await saveCurrentAsProfile("codex", "work");
    await createProfile("codex", "personal");
    await writeProfile("codex", "personal", "profile-content");

    await useProfile("codex", "personal", true);

    await expect(readFile(target, "utf8")).resolves.toBe("profile-content");
    const state = await getState();
    expect(state.apps[0].profiles.map((profile) => profile.name).sort()).toEqual(["personal", "work"]);
  });

  it("clears the active profile without deleting saved profiles", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "work-content", "utf8");
    await initApp("codex", target);
    await saveCurrentAsProfile("codex", "work");

    await clearActiveProfile("codex");

    await expect(readFile(target, "utf8")).rejects.toThrow();
    const state = await getState();
    expect(state.apps[0].activeProfile).toBeNull();
    expect(state.apps[0].targetExists).toBe(false);
    expect(state.apps[0].profiles.map((profile) => profile.name)).toEqual(["work"]);
  });

  it("does not clear modified target content that is not a saved profile", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "work-content", "utf8");
    await initApp("codex", target);
    await saveCurrentAsProfile("codex", "work");
    await writeFile(target, "unsaved-current", "utf8");

    await expect(clearActiveProfile("codex")).rejects.toThrow("No profile is currently in use");
    await expect(readFile(target, "utf8")).resolves.toBe("unsaved-current");
  });

  it("creates a backup only for unsaved target content", async () => {
    const target = path.join(targetDir, "auth.json");
    await writeFile(target, "unsaved-current", "utf8");
    await initApp("codex", target);
    await createProfile("codex", "personal");
    await writeProfile("codex", "personal", "profile-content");

    await useProfile("codex", "personal", true);

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

  it("renames a profile and keeps its contents", async () => {
    const target = path.join(targetDir, "config.yml");
    await initApp("gh", target);
    await createProfile("gh", "main");
    await writeProfile("gh", "main", "github.com:\n  user: dev");

    await renameProfile("gh", "main", "work");

    await expect(readProfile("gh", "work")).resolves.toContain("user: dev");
    const state = await getState();
    expect(state.apps[0].profiles.map((profile) => profile.name)).toEqual(["work"]);
    await expect(readProfile("gh", "main")).rejects.toThrow();
  });

  it("does not rename a profile over another profile", async () => {
    const target = path.join(targetDir, "config.yml");
    await initApp("gh", target);
    await createProfile("gh", "main");
    await createProfile("gh", "work");

    await expect(renameProfile("gh", "main", "work")).rejects.toThrow("already exists");
  });

  it("deletes a profile without touching the target file", async () => {
    const target = path.join(targetDir, "config.yml");
    await writeFile(target, "current-target", "utf8");
    await initApp("gh", target);
    await createProfile("gh", "main");

    await deleteProfile("gh", "main");

    await expect(readFile(target, "utf8")).resolves.toBe("current-target");
    const state = await getState();
    expect(state.apps[0].profiles).toEqual([]);
  });

  it("rejects deleting a missing profile", async () => {
    const target = path.join(targetDir, "config.yml");
    await initApp("gh", target);

    await expect(deleteProfile("gh", "missing")).rejects.toThrow("does not exist");
  });
});
