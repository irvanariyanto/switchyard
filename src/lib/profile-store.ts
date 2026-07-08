import { constants } from "node:fs";
import { access, copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { AppSummary, DiffLine, ProfileSummary, SwitchyardState } from "./types";

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SECRET_PATTERN = /((?:key|token|secret|password|auth)[^:=]*\s*[:=]\s*"?)([A-Za-z0-9_-]{8,})/gi;

export class SwitchyardError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "SwitchyardError";
  }
}

export function getConfigDir() {
  if (process.env.SWITCHYARD_CONFIG_DIR) return path.resolve(process.env.SWITCHYARD_CONFIG_DIR);
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "switchyard");
}

export function validateName(name: unknown, label = "Name"): string {
  if (typeof name !== "string") throw new SwitchyardError(`${label} is required.`);
  const trimmed = name.trim();
  if (!NAME_PATTERN.test(trimmed) || trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new SwitchyardError(`${label} must use letters, digits, dot, dash or underscore.`);
  }
  return trimmed;
}

export function expandTargetPath(rawPath: string) {
  let expanded = rawPath.trim();
  if (expanded === "~") expanded = os.homedir();
  if (expanded.startsWith("~/")) expanded = path.join(os.homedir(), expanded.slice(2));
  expanded = expanded.replace(/\$(\w+)|\$\{([^}]+)\}/g, (_match, plain: string, braced: string) => {
    const key = plain || braced;
    return process.env[key] ?? "";
  });
  return path.resolve(expanded);
}

export function maskSecrets(text: string) {
  return text.replace(SECRET_PATTERN, (_match, prefix: string, value: string) => {
    return `${prefix}${value.slice(0, 5)}**********`;
  });
}

function appDir(appName: string) {
  return path.join(getConfigDir(), appName);
}

function profilePath(appName: string, profileName: string) {
  return path.join(appDir(appName), profileName);
}

async function exists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureApp(appName: string) {
  const name = validateName(appName, "App name");
  const dir = appDir(name);
  if (!(await exists(path.join(dir, "TARGET")))) {
    throw new SwitchyardError(`App "${name}" is not registered.`, 404);
  }
  return { name, dir };
}

async function readTargetRaw(appName: string) {
  const { dir } = await ensureApp(appName);
  return (await readFile(path.join(dir, "TARGET"), "utf8")).trim();
}

async function readTargetBuffer(appName: string) {
  const raw = await readTargetRaw(appName);
  const targetPath = expandTargetPath(raw);
  if (!(await exists(targetPath))) return { raw, targetPath, exists: false, buffer: null as Buffer | null };
  return { raw, targetPath, exists: true, buffer: await readFile(targetPath) };
}

async function listProfileNames(appName: string) {
  const { dir } = await ensureApp(appName);
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name !== "TARGET")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function formatMtime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export async function initApp(appName: string, target: string) {
  const name = validateName(appName, "App name");
  if (typeof target !== "string" || !target.trim()) throw new SwitchyardError("Target path is required.");
  await mkdir(appDir(name), { recursive: true });
  await writeFile(path.join(appDir(name), "TARGET"), target.trim(), "utf8");
}

export async function removeApp(appName: string) {
  const name = validateName(appName, "App name");
  await rm(appDir(name), { recursive: true, force: true });
}

export async function getApp(appName: string): Promise<AppSummary> {
  const name = validateName(appName, "App name");
  const { raw, targetPath, exists: targetExists, buffer: targetBuffer } = await readTargetBuffer(name);
  const profileNames = await listProfileNames(name);
  const profiles: ProfileSummary[] = [];
  let activeProfile: string | null = null;

  for (const profileName of profileNames) {
    const filePath = profilePath(name, profileName);
    const [fileStat, profileBuffer] = await Promise.all([stat(filePath), readFile(filePath)]);
    const active = !!targetBuffer && targetBuffer.equals(profileBuffer);
    if (active) activeProfile = profileName;
    profiles.push({
      name: profileName,
      mtime: formatMtime(fileStat.mtime),
      status: active ? "active" : targetExists ? "saved" : "target-missing",
      active
    });
  }

  const status = !targetExists
    ? "target-missing"
    : profiles.length === 0
      ? "no-profiles"
      : activeProfile
        ? "in-sync"
        : "modified";

  return { name, target: raw, targetPath, targetExists, status, activeProfile, profiles };
}

export async function getState(): Promise<SwitchyardState> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir, { withFileTypes: true });
  const appNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const apps = [];
  for (const appName of appNames) {
    if (await exists(path.join(dir, appName, "TARGET"))) apps.push(await getApp(appName));
  }
  return { configDir: dir, apps };
}

export async function saveCurrentAsProfile(appName: string, profileName: string) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  const target = await readTargetBuffer(app);
  if (!target.exists || !target.buffer) throw new SwitchyardError(`Target file "${target.targetPath}" does not exist.`, 404);
  await writeFile(profilePath(app, profile), target.buffer);
}

export async function createProfile(appName: string, profileName: string) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  await ensureApp(app);
  await writeFile(profilePath(app, profile), "", "utf8");
}

export async function readProfile(appName: string, profileName: string) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  await ensureApp(app);
  return readFile(profilePath(app, profile), "utf8");
}

export async function writeProfile(appName: string, profileName: string, content: unknown) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  if (typeof content !== "string") throw new SwitchyardError("Profile content must be text.");
  await ensureApp(app);
  await writeFile(profilePath(app, profile), content, "utf8");
}

export async function useProfile(appName: string, profileName: string, backup: boolean) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  const target = await readTargetBuffer(app);
  const source = profilePath(app, profile);
  if (!(await exists(source))) throw new SwitchyardError(`Profile "${profile}" does not exist.`, 404);
  await mkdir(path.dirname(target.targetPath), { recursive: true });

  if (backup && target.exists && target.buffer && !(await targetMatchesExistingProfile(app, target.buffer))) {
    const backupName = makeBackupName();
    await writeFile(profilePath(app, backupName), target.buffer);
  }

  await copyFile(source, target.targetPath);
}

export async function clearActiveProfile(appName: string) {
  const app = validateName(appName, "App name");
  const target = await readTargetBuffer(app);
  if (!target.exists || !target.buffer || !(await targetMatchesExistingProfile(app, target.buffer))) {
    throw new SwitchyardError("No profile is currently in use.");
  }

  await rm(target.targetPath, { force: true });
}

async function targetMatchesExistingProfile(appName: string, targetBuffer: Buffer) {
  const profileNames = await listProfileNames(appName);
  for (const profileName of profileNames) {
    const profileBuffer = await readFile(profilePath(appName, profileName));
    if (targetBuffer.equals(profileBuffer)) return true;
  }
  return false;
}

export async function renameProfile(appName: string, oldName: string, newName: string) {
  const app = validateName(appName, "App name");
  const oldProfile = validateName(oldName, "Current profile name");
  const newProfile = validateName(newName, "New profile name");
  await ensureApp(app);
  const from = profilePath(app, oldProfile);
  const to = profilePath(app, newProfile);
  if (!(await exists(from))) throw new SwitchyardError(`Profile "${oldProfile}" does not exist.`, 404);
  if (oldProfile === newProfile) return;
  if (oldProfile !== newProfile && (await exists(to))) throw new SwitchyardError(`Profile "${newProfile}" already exists.`);
  await rename(from, to);
}

export async function duplicateProfile(appName: string, sourceName: string, newName?: string) {
  const app = validateName(appName, "App name");
  const source = validateName(sourceName, "Source profile name");
  await ensureApp(app);
  const finalName = validateName(newName || await nextCopyName(app, source), "Profile name");
  if (await exists(profilePath(app, finalName))) throw new SwitchyardError(`Profile "${finalName}" already exists.`);
  await copyFile(profilePath(app, source), profilePath(app, finalName));
  return finalName;
}

export async function deleteProfile(appName: string, profileName: string) {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  await ensureApp(app);
  if (!(await exists(profilePath(app, profile)))) throw new SwitchyardError(`Profile "${profile}" does not exist.`, 404);
  await rm(profilePath(app, profile), { force: true });
}

export async function diffTargetAgainstProfile(appName: string, profileName: string, reveal = false): Promise<DiffLine[]> {
  const app = validateName(appName, "App name");
  const profile = validateName(profileName, "Profile name");
  const target = await readTargetBuffer(app);
  const profileText = await readFile(profilePath(app, profile), "utf8");
  const targetText = target.buffer ? target.buffer.toString("utf8") : "";
  return diffLines(targetText, profileText, reveal);
}

function diffLines(targetText: string, profileText: string, reveal: boolean): DiffLine[] {
  const left = targetText.split("\n");
  const right = profileText.split("\n");
  const lines: DiffLine[] = [];
  const max = Math.max(left.length, right.length);
  const prep = (text: string) => reveal ? text : maskSecrets(text);

  for (let index = 0; index < max; index += 1) {
    if (left[index] === right[index]) {
      if (left[index] !== undefined) lines.push({ sign: " ", text: prep(left[index]) || " ", kind: "same" });
    } else {
      if (left[index] !== undefined) lines.push({ sign: "-", text: prep(left[index]) || " ", kind: "remove" });
      if (right[index] !== undefined) lines.push({ sign: "+", text: prep(right[index]) || " ", kind: "add" });
    }
  }

  return lines;
}

async function nextCopyName(appName: string, sourceName: string) {
  let candidate = `${sourceName}-copy`;
  let suffix = 2;
  while (await exists(profilePath(appName, candidate))) {
    candidate = `${sourceName}-copy-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function makeBackupName() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
  return `backup-${stamp}`;
}
