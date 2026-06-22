import Link from "next/link";
import { redirect } from "next/navigation";

import { FolderIcon, PenLineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { CreateProjectDialog } from "@/features/project/components/create-project-dialog";
import { ProjectsGrid } from "@/features/project/components/projects-grid";
import type {
  TeachingProject,
  TeachingSession,
} from "@/features/project/types/project-types";
import { createClient } from "@/lib/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const [projectsRes, sessionsRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_sessions")
      .select(
        "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at",
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as TeachingProject[];
  const sessions = (sessionsRes.data ?? []) as TeachingSession[];

  const sessionCounts = sessions.reduce<Record<string, number>>(
    (acc, session) => {
      acc[session.project_id] = (acc[session.project_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 rounded-lg   py-6  md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Projects
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your teaching workspace
            </h1>
            {/* <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Projects and sessions now live here instead of the sidebar. Open a project to review
              its sessions, edit them, and jump into talk mode from one place.
            </p> */}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <CreateProjectDialog />
          <Button
            variant="secondary"
            render={<Link href="/dashboard/session/new" />}
          >
            <PenLineIcon className="size-4" />
            New session
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderIcon />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create your first project to organize sessions by class, unit,
                or term.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      ) : (
        <ProjectsGrid projects={projects} sessionCounts={sessionCounts} />
      )}
    </section>
  );
}
