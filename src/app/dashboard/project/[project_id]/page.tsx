import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { ArrowLeftIcon, FolderIcon, PenLineIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProjectWorkspace } from "@/features/project/components/project-workspace"
import { formatDate } from "@/features/project/lib/project-lib"
import { teachingSessionSelect } from "@/features/session/lib/session-lib"
import type { TeachingProject } from "@/features/project/types/project-types"
import type { TeachingSession } from "@/features/session/types/session-types"
import { createClient } from "@/lib/server"

type PageProps = {
  params: Promise<{ project_id: string }>
  searchParams: Promise<{ session?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const [{ project_id }, { session: activeSessionId }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ])
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const [projectRes, sessionRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .eq("id", project_id)
      .single(),
    supabase
      .from("teaching_sessions")
      .select(teachingSessionSelect)
      .eq("owner_id", user.id)
      .eq("project_id", project_id)
      .order("updated_at", { ascending: false }),
  ])

  const { data: projectData, error: projectError } = projectRes
  const { data: sessionData, error: sessionError } = sessionRes

  if (projectError || !projectData) {
    notFound()
  }

  if (sessionError) {
    notFound()
  }

  const project = projectData as TeachingProject
  const sessions = (sessionData ?? []) as TeachingSession[]

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/projects" />}>
          <ArrowLeftIcon className="size-4" />
          Back to projects
        </Button>

        <Button render={<Link href={`/dashboard/session/new?project_id=${project.id}`} />}>
          <PenLineIcon className="size-4" />
          New session
        </Button>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-xs/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderIcon className="size-4" />
              <span>Project workspace</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {project.description ||
                  "This project groups all related teaching sessions together."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{sessions.length} sessions</Badge>
              <Badge variant="secondary">Updated {formatDate(project.updated_at)}</Badge>
            </div>
          </div>

          <div className="max-w-sm rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Keep this page lightweight: scan sessions, open the action menu, and edit anything
            without leaving the project.
          </div>
        </div>
      </div>

      <ProjectWorkspace
        project={project}
        sessions={sessions}
        initialSessionId={activeSessionId ?? null}
      />
    </section>
  )
}
