"use client";

import { useCallback, useMemo, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";

interface CaptchaFieldProps {
  /** 父组件在提交失败后递增，强制刷新验证码 */
  reloadNonce?: number;
  disabled?: boolean;
}

export function CaptchaField({ reloadNonce = 0, disabled }: CaptchaFieldProps) {
  const [localNonce, setLocalNonce] = useState(0);

  const imageSrc = useMemo(() => {
    const base = withBasePath("/api/auth/captcha");
    return `${base}?v=${reloadNonce}-${localNonce}`;
  }, [reloadNonce, localNonce]);

  const refresh = useCallback(() => {
    setLocalNonce((value) => value + 1);
  }, []);

  return (
    <div>
      <Label htmlFor="captcha">验证码</Label>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={refresh}
          disabled={disabled}
          className="shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
          title="点击刷新验证码"
          aria-label="刷新验证码"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="数字验证码，看不清请点击刷新"
            width={120}
            height={44}
            className="block h-11 w-[120px]"
          />
        </button>
        <Input
          id="captcha"
          name="captcha"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={8}
          placeholder="输入图中数字"
          disabled={disabled}
          className="flex-1"
        />
      </div>
      <p className="mt-1 text-xs text-stone-500">看不清可点击图片换一张，有效期 5 分钟</p>
    </div>
  );
}
