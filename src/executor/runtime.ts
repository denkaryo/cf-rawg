export interface ExecutionContext extends Record<string, any> {
  avg: (arr: number[]) => number;
  sum: (arr: number[]) => number;
  max: (arr: number[]) => number;
  min: (arr: number[]) => number;
  groupBy: <T>(arr: T[], key: string) => Record<string, T[]>;
}

export function buildContext(data: Record<string, any>): ExecutionContext {
  const helpers = {
    avg: (arr: number[]): number => {
      if (arr.length === 0) return NaN;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    },

    sum: (arr: number[]): number => {
      return arr.reduce((a, b) => a + b, 0);
    },

    max: (arr: number[]): number => {
      if (arr.length === 0) return NaN;
      return Math.max(...arr);
    },

    min: (arr: number[]): number => {
      if (arr.length === 0) return NaN;
      return Math.min(...arr);
    },

    groupBy: <T>(arr: T[], key: string): Record<string, T[]> => {
      const result: Record<string, T[]> = {};
      for (const item of arr) {
        const keyValue = getNestedValue(item, key);
        const keyStr = String(keyValue);
        if (!result[keyStr]) {
          result[keyStr] = [];
        }
        result[keyStr].push(item);
      }
      return result;
    },
  };

  return {
    ...data,
    ...helpers,
  };
}

function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }
  return value;
}

