import { validateCode } from './validator';

export interface ExecutionResult {
  success: boolean;
  value?: any;
  error?: string;
  executionTime?: number;
}

const MAX_EXECUTION_TIME_MS = 5000;

export function executeSafely(
  code: string,
  context: Record<string, any> = {}
): ExecutionResult {
  const startTime = Date.now();

  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  try {
    const allowedGlobals = {
      Math,
      Array,
      Object,
      JSON,
      Number,
      String,
      Date,
      RegExp,
    };

    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    const fn = new Function(
      ...contextKeys,
      'allowedGlobals',
      `
      const { Math, Array, Object, JSON, Number, String, Date, RegExp } = allowedGlobals;
      ${code}
    `
    );

    const result = fn(...contextValues, allowedGlobals);

    const executionTime = Date.now() - startTime;
    if (executionTime > MAX_EXECUTION_TIME_MS) {
      return {
        success: false,
        error: `Execution timeout: exceeded ${MAX_EXECUTION_TIME_MS}ms`,
        executionTime,
      };
    }

    return {
      success: true,
      value: result,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

