import { NextRequest } from "next/server";
import {
  clearActiveProfile,
  createProfile,
  deleteProfile,
  diffTargetAgainstProfile,
  duplicateProfile,
  getState,
  initApp,
  readProfile,
  removeApp,
  renameProfile,
  saveCurrentAsProfile,
  useProfile,
  writeProfile
} from "@/lib/profile-store";
import { assertLocalRequest, errorResponse } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type ActionBody = {
  action?: string;
  appName?: string;
  profileName?: string;
  oldName?: string;
  newName?: string;
  target?: string;
  content?: string;
  backup?: boolean;
  reveal?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    assertLocalRequest(request);
    const body = await request.json() as ActionBody;
    let data: unknown = null;

    switch (body.action) {
      case "state":
        data = await getState();
        break;
      case "init-app":
        await initApp(body.appName || "", body.target || "");
        data = await getState();
        break;
      case "remove-app":
        await removeApp(body.appName || "");
        data = await getState();
        break;
      case "save-current":
        await saveCurrentAsProfile(body.appName || "", body.profileName || "");
        data = await getState();
        break;
      case "create-profile":
        await createProfile(body.appName || "", body.profileName || "");
        data = await getState();
        break;
      case "read-profile":
        data = { content: await readProfile(body.appName || "", body.profileName || "") };
        break;
      case "write-profile":
        await writeProfile(body.appName || "", body.profileName || "", body.content ?? "");
        data = await getState();
        break;
      case "use-profile":
        await useProfile(body.appName || "", body.profileName || "", !!body.backup);
        data = await getState();
        break;
      case "clear-active-profile":
        await clearActiveProfile(body.appName || "");
        data = await getState();
        break;
      case "rename-profile":
        await renameProfile(body.appName || "", body.oldName || "", body.newName || "");
        data = await getState();
        break;
      case "duplicate-profile":
        await duplicateProfile(body.appName || "", body.profileName || "", body.newName);
        data = await getState();
        break;
      case "delete-profile":
        await deleteProfile(body.appName || "", body.profileName || "");
        data = await getState();
        break;
      case "diff-profile":
        data = { lines: await diffTargetAgainstProfile(body.appName || "", body.profileName || "", !!body.reveal) };
        break;
      default:
        return Response.json({ ok: false, error: "Unknown action." }, { status: 400 });
    }

    return Response.json({ ok: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
