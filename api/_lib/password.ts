/**
 * Password Policy Enforcement
 * Mandate: Minimum 12 characters, complexity requirements, breached/common dictionary check
 */

const COMMON_PASSWORDS = new Set([
  'password1234',
  'admin1234567',
  'police123456',
  'kenyapolicestation',
  'qwertyuiop12',
  '123456789012',
  'rockportpolice1',
  'welcometopolice',
  'changeme12345'
]);

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common or easily guessed. Choose a stronger passphrase.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const complexityCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (complexityCount < 3) {
    return { 
      valid: false, 
      error: 'Password must include at least 3 of: uppercase letters, lowercase letters, numbers, and special characters' 
    };
  }

  return { valid: true };
}
