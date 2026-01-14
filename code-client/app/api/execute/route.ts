import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth/jwt";
import type {
  ExecutionRequest,
  ExecutionResponse,
  ExecutionResult,
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
    const { code, languageId, stdin } = body;

    if (!code || !languageId) {
      return NextResponse.json(
        { success: false, error: "Code and languageId are required" },
        { status: 400 },
      );
    }

    const result = await mockExecuteCode(code, languageId, stdin ?? "", userId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute code" },
      { status: 500 },
    );
  }
}

async function mockExecuteCode(
  code: string,
  languageId: number,
  stdin: string,
  userId: string | null,
): Promise<ExecutionResult> {
  await new Promise((resolve) =>
    setTimeout(resolve, 100 + Math.random() * 400),
  );

  console.log(
    `[Mock Execution] User: ${userId ?? "guest"}, Language: ${languageId}`,
  );

  if (code.includes("syntax_error")) {
    return {
      stdout: null,
      stderr: null,
      compile_output: "SyntaxError: invalid syntax at line 1",
      time: "0.00",
      memory: 0,
      status: { id: 6, description: "Compilation Error" },
    };
  }

  if (code.includes("runtime_error") || code.includes("throw")) {
    return {
      stdout: null,
      stderr: "RuntimeError: division by zero",
      compile_output: null,
      time: "0.05",
      memory: 3400,
      status: { id: 11, description: "Runtime Error (NZEC)" },
    };
  }

  if (code.includes("while(true)") || code.includes("while True")) {
    return {
      stdout: null,
      stderr: "Time limit exceeded",
      compile_output: null,
      time: "2.00",
      memory: 5000,
      status: { id: 5, description: "Time Limit Exceeded" },
    };
  }

  const mockOutput = generateMockOutput(code, languageId, stdin);

  return {
    stdout: mockOutput,
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
  stdin: string,
): string {
  const printPatterns = [
    /print\s*\(\s*["'](.+?)["']\s*\)/g, // Python print("...")
    /console\.log\s*\(\s*["'](.+?)["']\s*\)/g, // JS console.log("...")
    /cout\s*<<\s*["'](.+?)["']/g, // C++ cout << "..."
    /System\.out\.println\s*\(\s*["'](.+?)["']\s*\)/g, // Java
  ];

  const outputs: string[] = [];

  for (const pattern of printPatterns) {
    const matches = code.matchAll(pattern);
    for (const match of matches) {
      outputs.push(match[1]);
    }
  }

  if (outputs.length > 0) {
    return outputs.join("\n") + "\n";
  }

  if (stdin) {
    const lines = stdin.trim().split("\n");
    if (lines.length === 1 && !isNaN(Number(lines[0]))) {
      const n = parseInt(lines[0]);
      return `${n * 2}\n`;
    }
    return lines.join("\n") + "\n";
  }

  return "Hello, World!\n";
}
