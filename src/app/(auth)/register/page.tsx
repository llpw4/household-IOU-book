import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardTitle } from "@/components/ui/card";
import { getOptionalUser } from "@/lib/auth/service";
import { createCsrfToken } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getOptionalUser();
  if (user) {
    redirect("/");
  }

  const csrfToken = await createCsrfToken();

  return (
    <Card className="w-full max-w-md">
      <CardTitle>注册账号</CardTitle>
      <p className="mt-2 text-sm text-stone-500">
        创建独立账本空间，您的数据仅本人可见
      </p>
      <div className="mt-6">
        <AuthForm mode="register" csrfToken={csrfToken} />
      </div>
    </Card>
  );
}
