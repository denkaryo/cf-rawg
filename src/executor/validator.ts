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

  // Note: We can't use new Function() in Cloudflare Workers, so we skip syntax validation here
  // QuickJS will catch syntax errors during execution
  // If we need syntax validation, we'd need to use a parser library like acorn or babel-parser

  return {
    valid: errors.length === 0,
    errors,
  };
}

