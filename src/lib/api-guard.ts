import { NextRequest } from "next/server";
import { SwitchyardError } from "./profile-store";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function assertLocalRequest(request: NextRequest) {
  const hostHeader = request.headers.get("host") || "";
  const host = parseHostName(hostHeader);
  if (!LOCAL_HOSTS.has(host)) {
    throw new SwitchyardError("Switchyard only accepts localhost requests by default.", 403);
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  let originHost = "";
  try {
    originHost = new URL(origin).hostname;
  } catch {
    throw new SwitchyardError("Invalid request origin.", 403);
  }

  if (!LOCAL_HOSTS.has(originHost)) {
    throw new SwitchyardError("Non-localhost origins are not allowed.", 403);
  }
}

function parseHostName(hostHeader: string) {
  if (hostHeader.startsWith("[")) {
    const end = hostHeader.indexOf("]");
    return end === -1 ? hostHeader : hostHeader.slice(0, end + 1);
  }
  return hostHeader.split(":")[0];
}

export function errorResponse(error: unknown) {
  if (error instanceof SwitchyardError) {
    return Response.json({ ok: false, error: error.message }, { status: error.status });
  }
  return Response.json({ ok: false, error: "Unexpected Switchyard error." }, { status: 500 });
}
