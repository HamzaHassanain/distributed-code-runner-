import { Request, Response } from "express";
import { judge0Service } from "../lib/judge0";
import { validateBatchRequest } from "../lib/validation";
import { logger } from "../lib/logger";

/**
 * @intent Handle batch code execution against multiple test cases (synchronous).
 * Executes test cases SEQUENTIALLY (not in parallel).
 */
export async function batchSubmit(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    const { sourceCode, languageId, testCases } = req.body;

    // Validation
    const validation = validateBatchRequest({ sourceCode, languageId, testCases });
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    logger.batch.debug('Executing batch', {
      languageId,
      testCaseCount: testCases.length,
      userId: user?.userId || 'guest',
    });

    const results: any[] = [];

    // Execute test cases SEQUENTIALLY (not in parallel)
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const result = await judge0Service.submitCode({
          source_code: sourceCode,
          language_id: languageId,
          stdin: testCase.stdin || "",
          cpu_time_limit: 15,
          memory_limit: 512000,
        });

        results.push({
          testCase: i + 1,
          status: result.status.description,
          statusId: result.status.id,
          output: result.stdout,
          stderr: result.stderr,
          compileOutput: result.compileOutput,
          time: result.time,
          memory: result.memory,
        });
      } catch (error: any) {
        // Include error in results for this test case
        results.push({
          testCase: i + 1,
          status: "Error",
          statusId: 0,
          output: null,
          stderr: error.message,
          compileOutput: null,
          time: null,
          memory: null,
        });
      }
    }

    logger.batch.debug('Batch execution complete', { testCaseCount: testCases.length });

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    logger.batch.error('Batch execution failed', {}, error);
    res.status(500).json({ success: false, error: error.message });
  }
}
