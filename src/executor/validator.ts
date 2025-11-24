export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /\bprocess\b/,
  /\brequire\s*\(/i,
  /\bimport\s+/i,
  /\bglobal\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
];

export function validateCode(code: string): ValidationResult {
  const errors: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
    return { valid: false, errors };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      const patternName = pattern.toString().replace(/[\/\^$]/g, '');
      errors.push(`Dangerous pattern detected: ${patternName}`);
    }
  }

  try {
    new Function(code);
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push(`Syntax error: ${error.message}`);
    } else {
      errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

