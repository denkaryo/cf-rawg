import { buildContext } from '../../executor/runtime';
import { executeSafely } from '../../executor/sandbox';

export interface ExecuteCalculationParams {
  code: string;
  data: Record<string, any>;
}

export async function handleExecuteCalculation(
  params: ExecuteCalculationParams
): Promise<{ result: any; success: boolean; error?: string; executionTime?: number }> {
  const context = buildContext(params.data);
  const executionResult = executeSafely(params.code, context);

  if (!executionResult.success) {
    return {
      result: null,
      success: false,
      error: executionResult.error,
      executionTime: executionResult.executionTime,
    };
  }

  return {
    result: executionResult.value,
    success: true,
    executionTime: executionResult.executionTime,
  };
}

export const executeCalculationTool = {
  name: 'execute_calculation',
  description: 'Execute JavaScript code for data analysis and calculations. Code has access to helper functions: avg(), sum(), max(), min(), groupBy()',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript code to execute. Should return a value. Code has access to data passed in the data parameter and helper functions.',
      },
      data: {
        type: 'object',
        description: 'Data to make available to the code execution context',
      },
    },
    required: ['code', 'data'],
  },
};

