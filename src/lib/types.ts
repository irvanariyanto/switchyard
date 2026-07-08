export type ProfileStatus = "active" | "saved" | "target-missing";

export type ProfileSummary = {
  name: string;
  mtime: string;
  status: ProfileStatus;
  active: boolean;
};

export type AppStatus = "in-sync" | "modified" | "target-missing" | "no-profiles";

export type AppSummary = {
  name: string;
  target: string;
  targetPath: string;
  targetExists: boolean;
  status: AppStatus;
  activeProfile: string | null;
  profiles: ProfileSummary[];
};

export type SwitchyardState = {
  configDir: string;
  apps: AppSummary[];
};

export type DiffLine = {
  sign: " " | "-" | "+";
  text: string;
  kind: "same" | "remove" | "add";
};
