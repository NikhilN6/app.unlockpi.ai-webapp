import { CircleHelpIcon, MailQuestionIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HelpPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-center gap-3">
        <CircleHelpIcon className="size-10 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
          <p className="text-sm text-muted-foreground">
            Quick guidance for navigating your workspace and teaching flows.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Where to manage work</CardTitle>
            <CardDescription>
              The sidebar is now only for navigation. Projects and sessions live in dedicated pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Open `Projects` to browse your teaching workspaces.</p>
            <p>Open a project to view, edit, and launch its sessions.</p>
            <p>Use `New session` to create a fresh session inside any project.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need more help?</CardTitle>
            <CardDescription>
              This can later connect to docs, contact, or guided onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <MailQuestionIcon className="size-4" />
            A fuller support surface can plug in here next.
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
