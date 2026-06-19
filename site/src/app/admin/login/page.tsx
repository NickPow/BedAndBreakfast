import { redirect } from "next/navigation";
import { signInAdmin } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid":
      return "Invalid login details. Please try again.";
    case "missing":
      return "Enter your email and password.";
    case "unauthorized":
      return "Your account does not have admin access.";
    default:
      return "";
  }
}

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = typeof params.error === "string" ? params.error : undefined;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    const roleResult = await getSupabaseServiceClient()
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const roleRow = roleResult.data as { role: string } | null;

    if (isAdminRole(roleRow?.role)) {
      redirect("/admin");
    }
  }

  return (
    <div className="site-shell section-pad">
      <section className="quote-panel mx-auto w-full max-w-xl rounded-[1.8rem] p-6 md:p-8">
        <span className="eyebrow">Admin access</span>
        <h1 className="section-title mt-4">Sign in</h1>
        <p className="section-copy mt-3">
          Use your admin credentials to review booking requests and manage blocked dates.
        </p>

        <form action={signInAdmin} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Email</span>
            <input
              className="input-field"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Password</span>
            <input
              className="input-field"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="text-sm font-semibold text-rose-700" aria-live="polite">
              {getErrorMessage(error)}
            </p>
          )}

          <button type="submit" className="button-primary mt-2">
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
}
