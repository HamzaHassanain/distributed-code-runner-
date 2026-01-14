import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth/jwt";
import type {
  ExecutionRequest,
  ExecutionResponse,
  ExecutionResult,
  TestCaseResult,
} from "@/lib/execution/types";

export async function POST(
  request: Request,
): Promise<NextResponse<ExecutionResponse>> {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      userId = payload?.userId ?? null;
    }

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

    console.log(
      `[Mock Batch Execution] User: ${userId ?? "guest"}, Language: ${languageId}, Test cases: ${testCases.length}`,
    );

    const results: TestCaseResult[] = await Promise.all(
      testCases.map(async (testCase) => {
        const result = await mockExecuteTestCase(
          code,
          languageId,
          testCase.input,
        );

        const passed = testCase.expectedOutput
          ? tokensMatch(result.stdout ?? "", testCase.expectedOutput)
          : result.status.id === 3;

        return {
          ...result,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          passed,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Batch execution error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute test cases" },
      { status: 500 },
    );
  }
}

async function mockExecuteTestCase(
  code: string,
  languageId: number,
  input: string,
): Promise<ExecutionResult> {
  await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));

  if (code.includes("syntax_error")) {
    return {
      stdout: null,
      stderr: null,
      compile_output: "SyntaxError: invalid syntax",
      time: "0.00",
      memory: 0,
      status: { id: 6, description: "Compilation Error" },
    };
  }

  if (code.includes("runtime_error")) {
    return {
      stdout: null,
      stderr: "RuntimeError: division by zero",
      compile_output: null,
      time: "0.05",
      memory: 3400,
      status: { id: 11, description: "Runtime Error (NZEC)" },
    };
  }

  const output = generateMockOutput(code, languageId, input);

  return {
    stdout: output,
    stderr: null,
    compile_output: null,
    time: (0.01 + Math.random() * 0.1).toFixed(3),
    memory: Math.floor(3000 + Math.random() * 2000),
    status: { id: 3, description: "Accepted" },
  };
}

function generateMockOutput(
  code: string,
  languageId: number,
  input: string,
): string {
  const lines = input.trim().split("\n");

  if (code.includes("sum") || code.includes("+")) {
    const numbers = lines
      .flatMap((line) => line.split(/\s+/))
      .map(Number)
      .filter((n) => !isNaN(n));
    if (numbers.length > 0) {
      return numbers.reduce((a, b) => a + b, 0).toString() + "\n";
    }
  }

  if (lines.length === 1 && !isNaN(Number(lines[0].trim()))) {
    const n = parseInt(lines[0].trim());
    return `${n * 2}\n`;
  }

  const parts = lines[0]
    .split(/\s+/)
    .map(Number)
    .filter((n) => !isNaN(n));
  if (parts.length === 2) {
    return (parts[0] + parts[1]).toString() + "\n";
  }

  return lines[0] + "\n";
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualTokens = actual
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const expectedTokens = expected
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (actualTokens.length !== expectedTokens.length) {
    return false;
  }

  for (let i = 0; i < actualTokens.length; i++) {
    if (actualTokens[i] !== expectedTokens[i]) {
      return false;
    }
  }

  return true;
}
