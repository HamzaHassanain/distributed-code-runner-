import { Request, Response } from "express";
import { judge0Service } from "../lib/judge0";
import { validateExecutionRequest } from "../lib/validation";
import { logger } from "../lib/logger";

/**
 * @intent Handle playground code execution (synchronous, no queue).
 */
export async function submitPlayground(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // Guests can still use playground (rate limited)
    const { sourceCode, languageId, stdin, expectedOutput } = req.body;

    // Validation
    const validation = validateExecutionRequest({ sourceCode, languageId, stdin });
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    logger.playground.debug('Executing code', { languageId, userId: user?.userId || 'guest' });

    // Direct execution via Judge0
    const result = await judge0Service.submitCode({
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || "",
      expected_output: expectedOutput || undefined,
      cpu_time_limit: 15,
      memory_limit: 512000,
    });

    const submissionResult = {
      status: result.status.description,
      statusId: result.status.id,
      output: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      time: result.time,
      memory: result.memory,
    };

    logger.playground.debug('Execution complete', { status: result.status.description });

    res.json({
      success: true,
      result: submissionResult,
    });
  } catch (error: any) {
    logger.playground.error('Execution failed', {}, error);
    res.status(500).json({ success: false, error: error.message });
  }
}
