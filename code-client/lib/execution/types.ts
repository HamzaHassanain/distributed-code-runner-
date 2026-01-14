export interface TestCase {
  input: string;
  expectedOutput?: string;
}

export interface ExecutionRequest {
  code: string;
  languageId: number;
  stdin?: string;
  testCases?: TestCase[];
}

export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory: number;
  status: {
    id: number;
    description: string;
  };
}

export interface TestCaseResult extends ExecutionResult {
  input: string;
  expectedOutput?: string;
  passed: boolean;
}

export interface ExecutionResponse {
  success: boolean;
  result?: ExecutionResult;
  results?: TestCaseResult[];
  error?: string;
}

export const LANGUAGES: Record<number, { name: string; extension: string }> = {
  71: { name: "Python 3", extension: "py" },
  63: { name: "JavaScript (Node.js)", extension: "js" },
  54: { name: "C++ 17", extension: "cpp" },
  62: { name: "Java", extension: "java" },
  74: { name: "TypeScript", extension: "ts" },
  73: { name: "Rust", extension: "rs" },
  60: { name: "Go", extension: "go" },
};

export const STATUS_CODES: Record<number, string> = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error (SIGSEGV)",
  8: "Runtime Error (SIGXFSZ)",
  9: "Runtime Error (SIGFPE)",
  10: "Runtime Error (SIGABRT)",
  11: "Runtime Error (NZEC)",
  12: "Runtime Error (Other)",
  13: "Internal Error",
  14: "Exec Format Error",
};
