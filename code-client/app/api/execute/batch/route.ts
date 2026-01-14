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
    const { code, languageId, testCases } = body;

    if (!code || !languageId) {
      return NextResponse.json(
        { success: false, error: "Code and languageId are required" },
        { status: 400 },
      );
    }

    if (!testCases || testCases.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one test case is required" },
        { status: 400 },
      );
    }

    const response = await proxyToRunnerService({
      path: "/editor/batch",
      request,
      body: {
        sourceCode: code,
        languageId,
        testCases: testCases.map(tc => ({ stdin: tc.input })), 
      },
    });

    if (!response.ok) {
       return response;
    }

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(data, { status: response.status });
    }
    
    const clientResults = data.results.map((r: any, index: number) => {
        const originalTestCase = testCases[index];
        const passed = originalTestCase.expectedOutput 
            ? (r.output || "").trim() === (originalTestCase.expectedOutput || "").trim() 
            : r.statusId === 3;

        return {
            stdout: r.output,
            stderr: r.stderr,
            compileOutput: r.compileOutput,
            time: r.time,
            memory: r.memory,
            status: r.status,
            statusId: r.statusId,
            input: originalTestCase.input,
            expectedOutput: originalTestCase.expectedOutput,
            passed
        };
    });

    return NextResponse.json({
        success: true,
        results: clientResults
    });

  } catch (error) {
    console.error("Batch execution error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request body or processing error" },
      { status: 500 },
    );
  }
}
