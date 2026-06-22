/**
 * Account deletion — Play Store hard requirement.
 *
 * Server function: deletes ALL user data + Auth row.
 * Runs as the authenticated user (RLS-aware for the read), then escalates
 * to service-role to delete the auth.users row (cascades to every
 * user_id-keyed table via ON DELETE CASCADE).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Not authenticated");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort row deletes (cascade from auth.users handles most, but we
    // double-tap to be safe and to leave a clean audit trail for support).
    const userTables = ["user_backups", "user_widgets", "user_analytics", "user_streaks", "user_goals"] as const;
    for (const t of userTables) {
      const { error } = await supabaseAdmin.from(t).delete().eq("user_id", userId);
      if (error) console.error(`[deleteMyAccount] failed to delete from ${t}`, error);
    }
    {
      const { error } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (error) console.error(`[deleteMyAccount] failed to delete from profiles`, error);
    }

    // Finally delete the auth user. This invalidates the session.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(`Failed to delete account: ${authErr.message}`);

    return { ok: true, userId };
  });
