export const PASSWORD_RULES_MESSAGE =
  "密码须至少 8 位，且同时包含字母、数字和特殊符号";

export const USERNAME_RULES_MESSAGE =
  "用户名为 2-32 位，只能包含字母、数字和下划线";

export interface PasswordRuleCheck {
  id: "length" | "letter" | "digit" | "special";
  label: string;
  passed: boolean;
}

export function getPasswordRuleChecks(password: string): PasswordRuleCheck[] {
  return [
    { id: "length", label: "至少 8 位", passed: password.length >= 8 },
    { id: "letter", label: "包含字母", passed: /[a-zA-Z]/.test(password) },
    { id: "digit", label: "包含数字", passed: /\d/.test(password) },
    {
      id: "special",
      label: "包含特殊符号",
      passed: /[^a-zA-Z0-9]/.test(password),
    },
  ];
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 32) {
    return USERNAME_RULES_MESSAGE;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return USERNAME_RULES_MESSAGE;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  const checks = getPasswordRuleChecks(password);
  if (checks.every((item) => item.passed)) {
    return null;
  }
  return PASSWORD_RULES_MESSAGE;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (password !== confirmPassword) {
    return "两次输入的密码不一致";
  }
  return null;
}
