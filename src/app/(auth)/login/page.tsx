import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardTitle } from "@/components/ui/card";
import { getOptionalUser } from "@/lib/auth/service";
import { createCsrfToken } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getOptionalUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const csrfToken = await createCsrfToken();

  return (
    <Card className="w-full max-w-md">
      <CardTitle>登录借还本</CardTitle>
      <p className="mt-2 text-sm text-stone-500">登录后查看与管理您的家庭借还款账本</p>
      <div className="mt-6">
        <AuthForm mode="login" csrfToken={csrfToken} next={params.next} />
      </div>
      <p className="mt-4 text-center text-xs text-stone-400">
        演示账号 testSeed/testSeed-20260811
      </p>
    </Card>
  );
}
