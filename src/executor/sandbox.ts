import { validateCode } from './validator';
import {
  newQuickJSWASMModule,
  RELEASE_SYNC as baseVariant,
  newVariant,
  shouldInterruptAfterDeadline,
  type QuickJSWASMModule,
} from 'quickjs-emscripten';
import cloudflareWasmModule from '../RELEASE_SYNC.wasm';

export interface ExecutionResult {
  success: boolean;
  value?: any;
  error?: string;
  executionTime?: number;
}

const MAX_EXECUTION_TIME_MS = 5000;
const MEMORY_LIMIT_BYTES = 10 * 1024 * 1024; // 10MB

// Create Cloudflare-specific variant
const cloudflareVariant = newVariant(baseVariant, {
  wasmModule: cloudflareWasmModule,
});

// Lazy-loaded QuickJS module singleton
let QuickJSModule: QuickJSWASMModule | null = null;
let quickJSPromise: Promise<QuickJSWASMModule> | null = null;

async function getQuickJS(): Promise<QuickJSWASMModule> {
  if (QuickJSModule) {
    return QuickJSModule;
  }
  if (quickJSPromise) {
    return quickJSPromise;
  }
  quickJSPromise = newQuickJSWASMModule(cloudflareVariant).then((module) => {
    QuickJSModule = module;
    quickJSPromise = null;
    return module;
  });
  return quickJSPromise;
}

function serializeContext(context: Record<string, any>): string {
  // Helper functions that need to be available in QuickJS
  const helpers = `
    const avg = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return NaN;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };
    
    const sum = (arr) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((a, b) => a + b, 0);
    };
    
    const max = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return NaN;
      return Math.max(...arr);
    };
    
    const min = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return NaN;
      return Math.min(...arr);
    };
    
    const groupBy = (arr, key) => {
      if (!Array.isArray(arr)) return {};
      const result = {};
      for (const item of arr) {
        const getNestedValue = (obj, path) => {
          const keys = path.split('.');
          let value = obj;
          for (const k of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[k];
          }
          return value;
        };
        const keyValue = getNestedValue(item, key);
        const keyStr = String(keyValue);
        if (!result[keyStr]) result[keyStr] = [];
        result[keyStr].push(item);
      }
      return result;
    };
  `;

  // Serialize context data to JSON and inject it
  const contextCode = Object.keys(context)
    .map((key) => {
      const value = context[key];
      // Functions can't be serialized, so we skip them (helpers are provided separately)
      if (typeof value === 'function') {
        return '';
      }
      try {
        const jsonValue = JSON.stringify(value);
        return `const ${key} = ${jsonValue};`;
      } catch (e) {
        // Skip values that can't be serialized
        return '';
      }
    })
    .filter(Boolean)
    .join('\n');

  return `${helpers}\n${contextCode}\n`;
}

export async function executeSafely(
  code: string,
  context: Record<string, any> = {}
): Promise<ExecutionResult> {
  const startTime = Date.now();

  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  try {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();

    // Set memory limit
    runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);

    // Create a context for evaluation
    const vm = runtime.newContext();

    // Build the full code with context and helpers
    const contextCode = serializeContext(context);
    // QuickJS doesn't support top-level return, so wrap in IIFE if code contains 'return'
    const trimmedCode = code.trim();
    const hasReturn = /\breturn\s+/.test(trimmedCode);
    const wrappedCode = hasReturn 
      ? `(function() { ${trimmedCode} })()` 
      : trimmedCode;
    const fullCode = `${contextCode}\n${wrappedCode}`;

    // Set timeout
    const deadline = Date.now() + MAX_EXECUTION_TIME_MS;
    const shouldInterrupt = shouldInterruptAfterDeadline(deadline);

    // Execute code
    const result = vm.evalCode(fullCode);

    if (result.error) {
      let errorMessage = 'Unknown error';
      try {
        const errorValue = vm.dump(result.error);
        if (typeof errorValue === 'string') {
          errorMessage = errorValue;
        } else if (errorValue && typeof errorValue === 'object') {
          // Try to extract message from error object
          errorMessage = errorValue.message || errorValue.toString() || JSON.stringify(errorValue);
        } else {
          errorMessage = String(errorValue);
        }
      } catch (e) {
        errorMessage = 'Error during execution';
      }
      result.error.dispose();
      vm.dispose();
      runtime.dispose();
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }

    // Get the result value
    const value = vm.dump(result.value);
    result.value.dispose();
    vm.dispose();
    runtime.dispose();

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
      value,
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

