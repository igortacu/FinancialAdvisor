import { supabase } from "@/api";

export async function upsertProfile(name?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Build profile data
  const profileData: { id: string; email: string; name?: string } = {
    id: user.id,
    email: user.email ?? "",
  };
  
  // Use provided name, or fallback to user_metadata name
  if (name) {
    profileData.name = name;
  } else if (user.user_metadata?.name) {
    profileData.name = user.user_metadata.name;
  }
  
  await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) {
    // PGRST116 means no rows found - this is expected for new users
    if (error.code === "PGRST116") {
      return null;
    }
    // Only log unexpected errors
    console.error("Error fetching profile:", error);
    return null;
  }
  
  return data;
}
