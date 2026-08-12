"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "概览" },
  { href: "/records/new", label: "记一笔" },
  { href: "/records", label: "流水" },
  { href: "/charts", label: "图表" },
  { href: "/parties", label: "相关方" },
  { href: "/settings/data", label: "数据管理" },
];

interface NavProps {
  username?: string | null;
}

export function Nav({ username }: NavProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-xl font-bold text-emerald-800">
            借还本
          </Link>
          <p className="text-sm text-stone-500">家庭借还款账本助手</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/parties"
                    ? pathname === "/parties" || pathname.startsWith("/parties/")
                    : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-emerald-100 text-emerald-900"
                      : "text-stone-600 hover:bg-stone-100",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {username ? (
            <div className="flex items-center gap-2 border-t border-stone-100 pt-3 sm:border-t-0 sm:pt-0 sm:pl-2">
              <span className="text-sm text-stone-500">{username}</span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
                >
                  退出
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
