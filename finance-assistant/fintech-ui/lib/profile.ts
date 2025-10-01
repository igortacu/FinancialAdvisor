import { supabase } from "@/api";

export async function upsertProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: "id" }
  );
}
