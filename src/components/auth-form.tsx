"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  checkUsernameAvailabilityAction,
  loginAction,
  refreshCsrfTokenAction,
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import {
  CSRF_EXPIRED_MESSAGE,
  CSRF_MAX_AGE_SECONDS,
  isCsrfTokenExpired,
} from "@/lib/auth/csrf-client";
import {
  getPasswordRuleChecks,
  PASSWORD_RULES_MESSAGE,
  USERNAME_RULES_MESSAGE,
  validatePasswordConfirmation,
} from "@/lib/auth/validation";

type AuthMode = "login" | "register";

type UsernameCheckStatus = "idle" | "checking" | "available" | "unavailable";

interface AuthFormProps {
  mode: AuthMode;
  csrfToken: string;
  next?: string;
}

const USERNAME_DEBOUNCE_MS = 400;

export function AuthForm({ mode, csrfToken: initialCsrfToken, next }: AuthFormProps) {
  const isRegister = mode === "register";
  const action = isRegister ? registerAction : loginAction;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    undefined,
  );

  const [csrfToken, setCsrfToken] = useState(initialCsrfToken);
  const [csrfExpired, setCsrfExpired] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isRefreshingCsrf, startRefreshCsrf] = useTransition();

  const [username, setUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState<{
    status: UsernameCheckStatus;
    message?: string;
  }>({ status: "idle" });
  const usernameCheckSeq = useRef(0);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChecked, setPasswordChecked] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const checkUsernameAvailability = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setUsernameCheck({ status: "idle" });
      return;
    }

    const seq = ++usernameCheckSeq.current;
    setUsernameCheck({ status: "checking" });

    const result = await checkUsernameAvailabilityAction(trimmed);
    if (seq !== usernameCheckSeq.current) {
      return;
    }

    if (result.available) {
      setUsernameCheck({ status: "available", message: "用户名可用" });
      return;
    }

    setUsernameCheck({
      status: "unavailable",
      message: result.error ?? "用户名不可用",
    });
  }, []);

  const checkCsrfExpiry = useCallback(() => {
    setCsrfExpired(isCsrfTokenExpired(csrfToken));
  }, [csrfToken]);

  useEffect(() => {
    setCsrfToken(initialCsrfToken);
  }, [initialCsrfToken]);

  useEffect(() => {
    checkCsrfExpiry();
    const timer = window.setInterval(checkCsrfExpiry, 30_000);
    return () => window.clearInterval(timer);
  }, [checkCsrfExpiry]);

  useEffect(() => {
    if (state?.error === CSRF_EXPIRED_MESSAGE) {
      setCsrfExpired(true);
    }
  }, [state?.error]);

  useEffect(() => {
    if (!isRegister) {
      return;
    }

    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameCheck({ status: "idle" });
      return;
    }

    const timer = window.setTimeout(() => {
      void checkUsernameAvailability(username);
    }, USERNAME_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [username, isRegister, checkUsernameAvailability]);

  const passwordChecks = useMemo(
    () => getPasswordRuleChecks(password),
    [password],
  );
  const passwordValid = passwordChecks.every((item) => item.passed);
  const confirmMismatch =
    confirmChecked &&
    confirmPassword.length > 0 &&
    validatePasswordConfirmation(password, confirmPassword) !== null;

  const usernameUnavailable =
    isRegister && usernameCheck.status === "unavailable";

  const registerBlocked =
    isRegister &&
    ((passwordChecked && !passwordValid) ||
      (confirmChecked && confirmMismatch) ||
      usernameUnavailable);

  function handleUsernameBlur() {
    if (!isRegister || !username.trim()) {
      return;
    }
    void checkUsernameAvailability(username);
  }

  function handlePasswordBlur() {
    if (password.length > 0) {
      setPasswordChecked(true);
    }
  }

  function handleConfirmBlur() {
    if (confirmPassword.length > 0) {
      setConfirmChecked(true);
    }
  }

  function handleRefreshCsrf() {
    setRefreshMessage(null);
    startRefreshCsrf(async () => {
      try {
        const nextToken = await refreshCsrfTokenAction();
        setCsrfToken(nextToken);
        setCsrfExpired(false);
        setRefreshMessage("安全令牌已刷新，请重新提交");
      } catch {
        setRefreshMessage("刷新失败，请手动刷新整个页面后重试");
      }
    });
  }

  const submitBlocked = pending || registerBlocked || csrfExpired || isRefreshingCsrf;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">请勿填写</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-xs text-stone-500">
        安全令牌有效期 {CSRF_MAX_AGE_SECONDS / 60} 分钟，超时需刷新后继续
      </p>

      {csrfExpired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p>{CSRF_EXPIRED_MESSAGE}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={handleRefreshCsrf}
            disabled={isRefreshingCsrf}
          >
            {isRefreshingCsrf ? "刷新中…" : "刷新令牌"}
          </Button>
        </div>
      ) : null}

      {refreshMessage ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {refreshMessage}
        </p>
      ) : null}

      <div>
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_]+"
          title="2-32 位字母、数字或下划线"
          value={isRegister ? username : undefined}
          onChange={
            isRegister
              ? (event) => setUsername(event.target.value)
              : undefined
          }
          onBlur={isRegister ? handleUsernameBlur : undefined}
        />
        {isRegister ? (
          <>
            <p className="mt-1 text-xs text-stone-500">{USERNAME_RULES_MESSAGE}</p>
            {usernameCheck.status === "checking" ? (
              <p className="mt-1 text-xs text-stone-500">正在检查用户名…</p>
            ) : null}
            {usernameCheck.status === "available" ? (
              <p className="mt-1 text-xs text-emerald-700">✓ {usernameCheck.message}</p>
            ) : null}
            {usernameCheck.status === "unavailable" ? (
              <p className="mt-1 text-xs text-red-600">✗ {usernameCheck.message}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={8}
          value={isRegister ? password : undefined}
          onChange={isRegister ? (event) => setPassword(event.target.value) : undefined}
          onBlur={isRegister ? handlePasswordBlur : undefined}
        />
        {isRegister ? (
          <>
            <p className="mt-1 text-xs text-stone-500">{PASSWORD_RULES_MESSAGE}</p>
            {passwordChecked && password.length > 0 ? (
              <ul className="mt-2 space-y-1 rounded-lg bg-stone-50 px-3 py-2 text-xs">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.id}
                    className={rule.passed ? "text-emerald-700" : "text-red-600"}
                  >
                    {rule.passed ? "✓" : "✗"} {rule.label}
                  </li>
                ))}
                {passwordValid ? (
                  <li className="text-emerald-700">✓ 密码符合要求</li>
                ) : null}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      {isRegister ? (
        <div>
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={handleConfirmBlur}
          />
          <p className="mt-1 text-xs text-stone-500">请再次输入相同密码，以防忘记时无法核对</p>
          {confirmMismatch ? (
            <p className="mt-1 text-xs text-red-600">两次输入的密码不一致</p>
          ) : null}
        </div>
      ) : null}

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitBlocked}>
        {pending ? "提交中…" : isRegister ? "注册并登录" : "登录"}
      </Button>

      <p className="text-center text-sm text-stone-600">
        {isRegister ? (
          <>
            已有账号？{" "}
            <Link href="/login" className="font-medium text-emerald-700 hover:underline">
              去登录
            </Link>
          </>
        ) : (
          <>
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-emerald-700 hover:underline">
              注册
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
