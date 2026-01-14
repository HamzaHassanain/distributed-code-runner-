import { NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/auth/jwt";

const CODE_RUNNER_SERVICE_URL =
  process.env.CODE_RUNNER_SERVICE_URL || "http://localhost:4000";

interface ProxyOptions {
  path: string;
  body: any;
  request: Request;
}

const AUTHN_TOKEN = process.env.AUTHN_TOKEN;

export async function proxyToRunnerService<T = any>(
  { path, body, request }: ProxyOptions
): Promise<NextResponse<T | { success: false; error: string }>> {
  try {
    const authHeader = request.headers.get("authorization");
    extractBearerToken(authHeader);

    const runnerResponse = await fetch(`${CODE_RUNNER_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AUTHN_TOKEN || "", 
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!runnerResponse.ok) {
      const errorText = await runnerResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText || "Unknown error from runner service" };
      }
      return NextResponse.json(
        { success: false, ...errorJson },
        { status: runnerResponse.status }
      );
    }

    const data = await runnerResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error to ${path}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to code runner service" },
      { status: 500 }
    );
  }
}
