import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth/jwt";
import type { ExecutionRequest, ExecutionResponse, ExecutionResult } from "@/lib/execution/types";

/**
 * Mock code execution endpoint
 * In production, this would forward to a Judge0 instance
 */
export async function POST(request: Request): Promise<NextResponse<ExecutionResponse>> {
  try {
    // Extract and verify auth token (optional - guests allowed)
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      userId = payload?.userId ?? null;
    }

    const body: ExecutionRequest = await request.json();
    const { code, languageId, stdin } = body;

    // Validate required fields
    if (!code || !languageId) {
      return NextResponse.json(
        { success: false, error: "Code and languageId are required" },
        { status: 400 }
      );
    }

    // Mock execution - simulate different scenarios based on code
    const result = await mockExecuteCode(code, languageId, stdin ?? "", userId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute code" },
      { status: 500 }
    );
  }
}

/**
 * Mock code execution
 * Simulates different execution outcomes based on code patterns
 */
async function mockExecuteCode(
  code: string,
  languageId: number,
  stdin: string,
  userId: string | null
): Promise<ExecutionResult> {
  // Simulate processing delay (100-500ms)
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

  // Log execution for debugging
  console.log(`[Mock Execution] User: ${userId ?? "guest"}, Language: ${languageId}`);

  // Check for syntax errors (simple mock)
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

  // Check for runtime errors
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

  // Check for infinite loop / TLE
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

  // Generate mock output based on language
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

/**
 * Generate mock output based on code patterns
 */
function generateMockOutput(code: string, languageId: number, stdin: string): string {
  // Try to detect print statements and return mock output
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

  // If we detected prints, return them
  if (outputs.length > 0) {
    return outputs.join("\n") + "\n";
  }

  // Default mock output
  if (stdin) {
    // Echo input with simple processing
    const lines = stdin.trim().split("\n");
    if (lines.length === 1 && !isNaN(Number(lines[0]))) {
      // If single number input, return some computation
      const n = parseInt(lines[0]);
      return `${n * 2}\n`;
    }
    return lines.join("\n") + "\n";
  }

  return "Hello, World!\n";
}
