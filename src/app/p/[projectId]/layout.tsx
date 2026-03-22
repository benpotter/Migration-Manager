import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProjectProviderClient } from "./project-provider-client";
import type { Project, UserRole } from "@/types";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/projects");
  }

  // Check membership
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  // Allow superadmins even without membership
  if (!membership) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      redirect("/projects");
    }
  }

  const userRole = (membership?.role ?? "admin") as UserRole;

  return (
    <ProjectProviderClient project={project as Project} userRole={userRole}>
      {children}
    </ProjectProviderClient>
  );
}
