"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppSummary, DiffLine, SwitchyardState } from "@/lib/types";

type Dialog = {
  type: "add-app" | "save" | "new" | "use" | "rename" | "delete" | "remove-app";
  appName?: string;
  profileName?: string;
  oldName?: string;
  name?: string;
  target?: string;
  backup?: boolean;
  overwrite?: boolean;
  error?: string;
};

type EditorState = {
  appName: string;
  profileName: string;
  content: string;
};

type DiffState = {
  appName: string;
  profileName: string;
  reveal: boolean;
  lines: DiffLine[];
};

type ActionResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function SwitchyardApp({ initialState }: { initialState: SwitchyardState }) {
  const [state, setState] = useState(initialState);
  const [selectedAppName, setSelectedAppName] = useState(initialState.apps[0]?.name ?? "");
  const [backupBeforeSwitch, setBackupBeforeSwitch] = useState(true);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [diff, setDiff] = useState<DiffState | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const selectedApp = useMemo(() => {
    return state.apps.find((app) => app.name === selectedAppName) ?? state.apps[0] ?? null;
  }, [selectedAppName, state.apps]);

  useEffect(() => {
    if (!selectedAppName && state.apps[0]) setSelectedAppName(state.apps[0].name);
    if (selectedAppName && !state.apps.some((app) => app.name === selectedAppName)) {
      setSelectedAppName(state.apps[0]?.name ?? "");
    }
  }, [selectedAppName, state.apps]);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }

  async function api<T>(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json() as ActionResponse<T>;
      if (!json.ok) throw new Error(json.error || "Switchyard request failed.");
      return json.data as T;
    } finally {
      setBusy(false);
    }
  }

  function validName(name: string) {
    return NAME_PATTERN.test(name) && !name.includes("..");
  }

  async function submitDialog() {
    if (!dialog) return;
    try {
      if (dialog.type === "add-app") {
        const name = (dialog.name || "").trim();
        const target = (dialog.target || "").trim();
        if (!validName(name)) return setDialog({ ...dialog, error: "Use letters, digits, dot, dash or underscore." });
        if (!target) return setDialog({ ...dialog, error: "Target path is required." });
        const next = await api<SwitchyardState>({ action: "init-app", appName: name, target });
        setState(next);
        setSelectedAppName(name);
        setDialog(null);
        notify(`Added app "${name}"`);
      }

      if (dialog.type === "save" && selectedApp) {
        const name = (dialog.name || "").trim();
        if (!validName(name)) return setDialog({ ...dialog, error: "Invalid profile name." });
        if (selectedApp.profiles.some((profile) => profile.name === name) && !dialog.overwrite) {
          return setDialog({ ...dialog, overwrite: true, error: "Profile exists. Confirm again to overwrite." });
        }
        const next = await api<SwitchyardState>({ action: "save-current", appName: selectedApp.name, profileName: name });
        setState(next);
        setDialog(null);
        notify(`Saved current target as "${name}"`);
      }

      if (dialog.type === "new" && selectedApp) {
        const name = (dialog.name || "").trim();
        if (!validName(name)) return setDialog({ ...dialog, error: "Invalid profile name." });
        if (selectedApp.profiles.some((profile) => profile.name === name) && !dialog.overwrite) {
          return setDialog({ ...dialog, overwrite: true, error: "Profile exists. Confirm again to overwrite." });
        }
        const next = await api<SwitchyardState>({ action: "create-profile", appName: selectedApp.name, profileName: name });
        setState(next);
        setDialog(null);
        setEditor({ appName: selectedApp.name, profileName: name, content: "" });
        notify(`Created profile "${name}"`);
      }

      if (dialog.type === "use" && dialog.appName && dialog.profileName) {
        const next = await api<SwitchyardState>({
          action: "use-profile",
          appName: dialog.appName,
          profileName: dialog.profileName,
          backup: !!dialog.backup
        });
        setState(next);
        setDialog(null);
        notify(`Switched ${dialog.appName} to "${dialog.profileName}"`);
      }

      if (dialog.type === "rename" && selectedApp && dialog.oldName) {
        const nextName = (dialog.name || "").trim();
        if (!validName(nextName)) return setDialog({ ...dialog, error: "Invalid profile name." });
        const next = await api<SwitchyardState>({
          action: "rename-profile",
          appName: selectedApp.name,
          oldName: dialog.oldName,
          newName: nextName
        });
        setState(next);
        setDialog(null);
        notify(`Renamed "${dialog.oldName}" to "${nextName}"`);
      }

      if (dialog.type === "delete" && selectedApp && dialog.profileName) {
        const next = await api<SwitchyardState>({
          action: "delete-profile",
          appName: selectedApp.name,
          profileName: dialog.profileName
        });
        setState(next);
        setDialog(null);
        notify(`Deleted profile "${dialog.profileName}"`);
      }

      if (dialog.type === "remove-app" && selectedApp) {
        const next = await api<SwitchyardState>({ action: "remove-app", appName: selectedApp.name });
        setState(next);
        setSelectedAppName(next.apps[0]?.name ?? "");
        setDialog(null);
        notify(`Removed app "${selectedApp.name}"`);
      }
    } catch (error) {
      setDialog({ ...dialog, error: error instanceof Error ? error.message : "Request failed." });
    }
  }

  async function openEditor(appName: string, profileName: string) {
    try {
      const data = await api<{ content: string }>({ action: "read-profile", appName, profileName });
      setEditor({ appName, profileName, content: data.content });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not read profile");
    }
  }

  async function saveEditor() {
    if (!editor) return;
    try {
      const next = await api<SwitchyardState>({
        action: "write-profile",
        appName: editor.appName,
        profileName: editor.profileName,
        content: editor.content
      });
      setState(next);
      setEditor(null);
      notify(`Saved "${editor.profileName}"`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save profile");
    }
  }

  async function openDiff(appName: string, profileName: string, reveal = false) {
    try {
      const data = await api<{ lines: DiffLine[] }>({ action: "diff-profile", appName, profileName, reveal });
      setDiff({ appName, profileName, reveal, lines: data.lines });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not diff profile");
    }
  }

  const appStatus = selectedApp ? statusPresentation(selectedApp) : null;
  const showModifiedBanner = selectedApp?.status === "modified";
  const showMissingBanner = selectedApp?.status === "target-missing";

  return (
    <main className="page-shell">
      <section className="window" aria-label="Switchyard main window">
        <aside className="sidebar">
          <div className="brand">
            <strong>Switchyard</strong>
            <span>v0.1</span>
          </div>

          <div className="side-heading">
            <span>APPS</span>
            <button
              className="icon-button"
              type="button"
              title="Add app"
              aria-label="Add app"
              onClick={(event) => {
                event.stopPropagation();
                setDialog({ type: "add-app", name: "", target: "" });
              }}
            >
              +
            </button>
          </div>

          <div className="app-list">
            {state.apps.map((app) => {
              const presentation = statusPresentation(app);
              return (
                <button
                  key={app.name}
                  type="button"
                  className={`app-row ${app.name === selectedApp?.name ? "selected" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedAppName(app.name);
                  }}
                >
                  <span className={`status-dot ${presentation.tone}`} title={presentation.label} />
                  <span className="app-row-main">
                    <span className="mono app-row-name">{app.name}</span>
                    <span>{presentation.label}</span>
                  </span>
                  <span className="count">{app.profiles.length}</span>
                </button>
              );
            })}
            {state.apps.length === 0 && <p className="empty-side">No apps yet.</p>}
          </div>

          <div className="sidebar-spacer" />
          <button
            type="button"
            className="toggle-row"
            onClick={(event) => {
              event.stopPropagation();
              setBackupBeforeSwitch((value) => !value);
            }}
          >
            <span className={`toggle ${backupBeforeSwitch ? "on" : ""}`}>
              <span />
            </span>
            <span>Backup before switch</span>
          </button>
          <div className="config-path mono" title={state.configDir}>{state.configDir}</div>
        </aside>

        <section className="main-pane">
          {selectedApp && appStatus ? (
            <>
              <header className="app-header">
                <div className="app-title-block">
                  <div className="title-line">
                    <h1 className="mono">{selectedApp.name}</h1>
                    <span className={`pill ${appStatus.tone}`}>{appStatus.label}</span>
                  </div>
                  <div className="target-line">
                    <span>target</span>
                    <code title={selectedApp.targetPath}>{selectedApp.target}</code>
                  </div>
                </div>
                <div className="header-actions">
                  <button type="button" className="secondary-button" onClick={() => setDialog({ type: "new", name: "" })}>
                    New profile
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!selectedApp.targetExists || busy}
                    onClick={() => setDialog({ type: "save", name: "" })}
                  >
                    Save current as profile
                  </button>
                </div>
              </header>

              {(showMissingBanner || showModifiedBanner) && (
                <div className={`banner ${showMissingBanner ? "danger" : "warning"}`}>
                  <span>
                    {showMissingBanner
                      ? `Target file ${selectedApp.target} does not exist yet. Switching to a profile will create it.`
                      : "Target has been modified since the last save. No profile matches it."}
                  </span>
                  {showModifiedBanner && (
                    <button type="button" onClick={() => setDialog({ type: "save", name: "" })}>
                      Save now
                    </button>
                  )}
                </div>
              )}

              <div className="profile-list" aria-label="Profiles">
                {selectedApp.profiles.map((profile) => (
                  <article key={profile.name} className={`profile-row ${profile.active ? "active" : ""}`}>
                    <div className="profile-meta">
                      <strong className="mono">{profile.name}</strong>
                      <span>{profile.mtime}</span>
                    </div>
                    <span className={`profile-status ${profile.active ? "active" : ""}`}>
                      {profile.active ? "ACTIVE" : selectedApp.targetExists ? "saved" : "-"}
                    </span>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className={profile.active ? "disabled-button" : "primary-button small"}
                        disabled={profile.active || busy}
                        onClick={() => setDialog({
                          type: "use",
                          appName: selectedApp.name,
                          profileName: profile.name,
                          backup: backupBeforeSwitch
                        })}
                      >
                        {profile.active ? "In use" : "Use"}
                      </button>
                      <button type="button" className="secondary-button small" onClick={() => openEditor(selectedApp.name, profile.name)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button small"
                        disabled={!selectedApp.targetExists}
                        onClick={() => openDiff(selectedApp.name, profile.name)}
                      >
                        Diff
                      </button>
                    </div>
                  </article>
                ))}

                {selectedApp.profiles.length === 0 && (
                  <div className="empty-main">
                    <h2>No profiles</h2>
                    <p>
                      {selectedApp.targetExists
                        ? "Save the current target file as your first named profile."
                        : "The target does not exist yet. Create a profile from scratch."}
                    </p>
                    <div className="empty-actions">
                      <button type="button" className="secondary-button" onClick={() => setDialog({ type: "new", name: "" })}>
                        New profile
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!selectedApp.targetExists}
                        onClick={() => setDialog({ type: "save", name: "" })}
                      >
                        Save current
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-apps">
              <h1>Switchyard</h1>
              <button type="button" className="primary-button" onClick={() => setDialog({ type: "add-app", name: "", target: "" })}>
                Add your first app
              </button>
            </div>
          )}
        </section>

        {editor && (
          <div className="sheet-overlay" onClick={() => setEditor(null)}>
            <aside className="editor-sheet" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <h2>Edit profile</h2>
                  <code>{state.configDir}/{editor.appName}/{editor.profileName}</code>
                </div>
                <button className="icon-button" type="button" aria-label="Close editor" onClick={() => setEditor(null)}>x</button>
              </header>
              <div className="warning-note">May contain credentials. Contents are never logged and stay on this machine.</div>
              <textarea
                spellCheck={false}
                value={editor.content}
                onChange={(event) => setEditor({ ...editor, content: event.target.value })}
              />
              <footer>
                <button type="button" className="secondary-button" onClick={() => setEditor(null)}>Cancel</button>
                <button type="button" className="primary-button" onClick={saveEditor}>Save profile</button>
              </footer>
            </aside>
          </div>
        )}

        {diff && (
          <div className="modal-overlay" onClick={() => setDiff(null)}>
            <section className="diff-modal" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <h2>Diff "{diff.profileName}"</h2>
                  <p>{diff.reveal ? "Secrets visible" : "Secrets masked"}</p>
                </div>
                <div className="diff-actions">
                  <button type="button" className="secondary-button small" onClick={() => openDiff(diff.appName, diff.profileName, !diff.reveal)}>
                    {diff.reveal ? "Mask secrets" : "Reveal secrets"}
                  </button>
                  <button className="icon-button" type="button" aria-label="Close diff" onClick={() => setDiff(null)}>x</button>
                </div>
              </header>
              <pre className="diff-lines">
                {diff.lines.length === 0
                  ? "No differences."
                  : diff.lines.map((line, index) => (
                    <span key={`${index}-${line.kind}`} className={`diff-line ${line.kind}`}>
                      <span className="diff-sign">{line.sign}</span>{line.text}
                    </span>
                  ))}
              </pre>
            </section>
          </div>
        )}

        {dialog && (
          <div className="modal-overlay" onClick={() => setDialog(null)}>
            <section className="dialog" onClick={(event) => event.stopPropagation()}>
              <h2>{dialogTitle(dialog)}</h2>
              <p>{dialogCopy(dialog, selectedApp)}</p>

              {dialog.type === "add-app" && (
                <div className="field-stack">
                  <label>
                    <span>App name</span>
                    <input
                      autoFocus
                      value={dialog.name || ""}
                      onChange={(event) => setDialog({ ...dialog, name: event.target.value, error: undefined })}
                    />
                  </label>
                  <label>
                    <span>Target file path</span>
                    <input
                      value={dialog.target || ""}
                      placeholder="~/.codex/auth.json"
                      onChange={(event) => setDialog({ ...dialog, target: event.target.value, error: undefined })}
                    />
                  </label>
                </div>
              )}

              {(dialog.type === "save" || dialog.type === "new" || dialog.type === "rename") && (
                <label className="field-stack">
                  <span>{dialog.type === "rename" ? "New profile name" : "Profile name"}</span>
                  <input
                    autoFocus
                    value={dialog.name || ""}
                    onChange={(event) => setDialog({ ...dialog, name: event.target.value, error: undefined, overwrite: false })}
                  />
                </label>
              )}

              {dialog.type === "use" && (
                <div className="use-details">
                  <code>{selectedApp?.target}</code>
                  <code>{state.configDir}/{dialog.appName}/{dialog.profileName}</code>
                  <button
                    type="button"
                    className="toggle-row inline"
                    onClick={() => setDialog({ ...dialog, backup: !dialog.backup })}
                  >
                    <span className={`toggle ${dialog.backup ? "on" : ""}`}><span /></span>
                    <span>Backup before switch</span>
                  </button>
                </div>
              )}

              {dialog.error && <div className="dialog-error">{dialog.error}</div>}
              {dialog.type === "use" && !dialog.backup && (
                <div className="dialog-warning">Current target contents will be lost. Enable backup to keep them.</div>
              )}

              <footer>
                <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
                <button
                  type="button"
                  className={dialog.type === "delete" || dialog.type === "remove-app" ? "danger-button" : "primary-button"}
                  disabled={busy}
                  onClick={submitDialog}
                >
                  {dialogConfirmLabel(dialog)}
                </button>
              </footer>
            </section>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </section>
    </main>
  );
}

function statusPresentation(app: AppSummary) {
  if (app.status === "target-missing") return { label: "target missing", tone: "danger" };
  if (app.status === "modified") return { label: "modified", tone: "warning" };
  if (app.status === "no-profiles") return { label: "no profiles", tone: "muted" };
  return { label: `in sync: ${app.activeProfile}`, tone: "accent" };
}

function dialogTitle(dialog: Dialog) {
  switch (dialog.type) {
    case "add-app": return "Add app";
    case "save": return "Save current as profile";
    case "new": return "New profile";
    case "use": return `Switch to "${dialog.profileName}"`;
    case "rename": return "Rename profile";
    case "delete": return `Delete "${dialog.profileName}"?`;
    case "remove-app": return "Remove app?";
  }
}

function dialogCopy(dialog: Dialog, app: AppSummary | null) {
  switch (dialog.type) {
    case "add-app": return "Register a config file to manage.";
    case "save": return `Copies the current contents of ${app?.target ?? "the target"} into a named profile.`;
    case "new": return "Creates an empty profile and opens the editor.";
    case "use": return "This overwrites the target file. The app reads it next time it runs.";
    case "rename": return "Profile files keep their contents.";
    case "delete": return "This removes the saved profile. The target file is not touched.";
    case "remove-app": return "This removes Switchyard's saved profiles for the app. The target file is not touched.";
  }
}

function dialogConfirmLabel(dialog: Dialog) {
  if ((dialog.type === "save" || dialog.type === "new") && dialog.overwrite) return "Overwrite";
  switch (dialog.type) {
    case "add-app": return "Add app";
    case "save": return "Save profile";
    case "new": return "Create and edit";
    case "use": return "Switch";
    case "rename": return "Rename";
    case "delete": return "Delete";
    case "remove-app": return "Remove app";
  }
}
