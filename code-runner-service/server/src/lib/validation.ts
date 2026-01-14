/**
 * @intent Validation Logic for code execution requests.
 */

export const MAX_SOURCE_CODE_SIZE = 256 * 1024; // 256 KB
export const MAX_STDIN_SIZE = 10 * 1024 * 1024; // 10 MB

export const VALID_LANGUAGE_IDS = [
  // C++ (Custom GCC 14 / Clang 18)
  200, 201, 202, 203, 204,
  // C++ (Legacy GCC 9.2.0)
  54,
  // C (GCC 14)
  240,
  // Java (Custom Java 21 / Legacy Java 13)
  210, 211, 62,
  // Python (PyPy 3.10 / Legacy 3.8.1)
  220, 71,
  // JavaScript (Node.js 20 LTS)
  230,
  // TypeScript (Custom 5.9.3 / Legacy 3.7.4)
  270, 74,
  // Go (Custom LTS 1.23.4 / Legacy 1.13.5)
  260, 60,
  // Rust (Custom LTS 1.92.0 / Legacy 1.40.0)
  250, 73,
  // C# (Mono 6.6.0.161)
  51,
  // Ruby (2.7.0)
  72,
  // Swift (5.2.3)
  83,
  // PHP (7.4.1)
  68,
  // Kotlin (1.3.70)
  78
];

/**
 * @intent Validate execution request body.
 */
export function validateExecutionRequest(body: {
  sourceCode?: string;
  languageId?: number;
  stdin?: string;
}): { valid: boolean; error?: string } {
  if (!body.sourceCode || typeof body.sourceCode !== "string") {
    return { valid: false, error: "Invalid sourceCode" };
  }

  if (body.sourceCode.length > MAX_SOURCE_CODE_SIZE) {
    return { valid: false, error: "Source code too large" };
  }

  if (
    typeof body.languageId !== "number" ||
    !VALID_LANGUAGE_IDS.includes(body.languageId)
  ) {
    return { valid: false, error: "Invalid languageId" };
  }

  if (body.stdin && typeof body.stdin === "string" && body.stdin.length > MAX_STDIN_SIZE) {
    return { valid: false, error: "stdin too large" };
  }

  return { valid: true };
}

/**
 * @intent Validate batch execution request body.
 */
export function validateBatchRequest(body: {
  sourceCode?: string;
  languageId?: number;
  testCases?: { stdin: string }[];
}): { valid: boolean; error?: string } {
  // Validate base fields
  const baseValidation = validateExecutionRequest({
    sourceCode: body.sourceCode,
    languageId: body.languageId,
  });
  if (!baseValidation.valid) {
    return baseValidation;
  }

  // Validate test cases
  if (!body.testCases || !Array.isArray(body.testCases)) {
    return { valid: false, error: "testCases is required and must be an array" };
  }

  if (body.testCases.length === 0) {
    return { valid: false, error: "testCases must not be empty" };
  }

  for (let i = 0; i < body.testCases.length; i++) {
    const tc = body.testCases[i];
    if (typeof tc.stdin !== "string") {
      return { valid: false, error: `Test case ${i + 1}: stdin must be a string` };
    }
  }

  return { valid: true };
}
