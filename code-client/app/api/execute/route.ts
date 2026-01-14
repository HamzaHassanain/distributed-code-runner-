import { NextResponse } from "next/server";
import { proxyToRunnerService } from "@/lib/execution/proxy";
import type {
  ExecutionRequest,
  ExecutionResponse,
} from "@/lib/execution/types";

export async function POST(
  request: Request,
): Promise<NextResponse<ExecutionResponse>> {
  try {
    const body: ExecutionRequest = await request.json();
    const { code, languageId, stdin } = body;

    if (!code || !languageId) {
      return NextResponse.json(
        { success: false, error: "Code and languageId are required" },
        { status: 400 },
      );
    }

    return proxyToRunnerService({
      path: "/playground",
      request,
      body: {
        sourceCode: code,
        languageId,
        stdin,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
