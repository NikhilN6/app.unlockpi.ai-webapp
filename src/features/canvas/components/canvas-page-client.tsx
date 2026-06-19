"use client";

import "@puckeditor/core/puck.css";

import { Puck, type Overrides } from "@puckeditor/core";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BotIcon,
  BracesIcon,
  BoxesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  Code2Icon,
  CopyIcon,
  GitBranchIcon,
  Heading1Icon,
  HouseIcon,
  LayoutPanelTopIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  MicIcon,
  MoonIcon,
  NetworkIcon,
  PanelRightIcon,
  PlusIcon,
  SaveIcon,
  Share2Icon,
  SparklesIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "use-debounce";
import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient as createSupabaseClient } from "@/lib/client";
import {
  applyCanvasAction,
  getInitialSlideId,
  normalizeCanvasFrames,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import { canvasPuckConfig } from "@/features/canvas/lib/canvas-puck-config";
import type { CanvasRecord, CanvasSummary } from "@/features/canvas/lib/canvas-records";
import {
  canvasTemplateOptions,
  createCanvasTemplate,
} from "@/features/canvas/lib/canvas-templates";
import type {
  CanvasAiAction,
  CanvasDocument,
  CanvasTemplateKey,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

type ActionLogItem = {
  id: string;
  message: string;
};

type FrameSummary = {
  id: string;
  title: string;
};

type LeftPanelView =
  | "home"
  | "frames"
  | "changes"
  | "commands"
  | "voice"
  | "templates";

type CanvasPageClientProps = {
  initialCanvas?: CanvasRecord | null;
  initialCanvases?: CanvasSummary[];
};

type DrawerItemMeta = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "heading" | "subheading" | "body";
};

const leftPanelItems: Array<{
  id: LeftPanelView;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "frames", label: "Frames", icon: LayoutPanelTopIcon },
  { id: "changes", label: "Recent changes", icon: Clock3Icon },
  { id: "commands", label: "Command JSON", icon: BracesIcon },
  { id: "voice", label: "Quick voice", icon: MicIcon },
  { id: "templates", label: "Templates", icon: SparklesIcon },
];

const quickCommands: Array<{ label: string; action: CanvasAiAction }> = [
  {
    label: "Add array",
    action: { action: "add_array_block", title: "Array B", values: ["2", "4", "6", "8"] },
  },
  {
    label: "Make array length 6",
    action: { action: "resize_array", length: 6 },
  },
  {
    label: "Highlight index 2",
    action: { action: "highlight_array_index", index: 2 },
  },
  {
    label: "Add next frame",
    action: { action: "add_frame", title: "Next teaching beat" },
  },
];

const drawerItemMeta: Record<string, DrawerItemMeta> = {
  SlideBlock: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  Frame: {
    label: "Frame",
    description: "A blank teaching canvas frame",
    icon: LayoutPanelTopIcon,
  },
  HeadingTextBlock: {
    label: "Heading",
    variant: "heading",
  },
  Heading: {
    label: "Heading",
    variant: "heading",
  },
  SubheadingTextBlock: {
    label: "Subheading",
    variant: "subheading",
  },
  Subheading: {
    label: "Subheading",
    variant: "subheading",
  },
  BodyTextBlock: {
    label: "Body",
    variant: "body",
  },
  Body: {
    label: "Body",
    variant: "body",
  },
  TextBlock: {
    label: "Legacy text",
    description: "Older stacked text block",
    icon: Heading1Icon,
  },
  CheckpointBlock: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  Checkpoint: {
    label: "Checkpoint",
    description: "Question and expected answer",
    icon: ListChecksIcon,
  },
  ArrayBlock: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  Array: {
    label: "Array",
    description: "Resizable indexed elements",
    icon: BoxesIcon,
  },
  LinkedListBlock: {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  "Linked list": {
    label: "Linked list",
    description: "Nodes connected by pointers",
    icon: GitBranchIcon,
  },
  MindMapBlock: {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  "Mind map": {
    label: "Mind map",
    description: "Concept map with branches",
    icon: NetworkIcon,
  },
  CodeBlock: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  Code: {
    label: "Code",
    description: "Snippet and explanation",
    icon: Code2Icon,
  },
  MermaidBlock: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
  Mermaid: {
    label: "Mermaid",
    description: "Diagram from Mermaid syntax",
    icon: Share2Icon,
  },
};

function CanvasDrawerItem({ name }: { name: string }) {
  const meta = drawerItemMeta[name] ?? {
    label: name,
    description: "Drag into a frame",
    icon: BoxesIcon,
  };
  const Icon = meta.icon ?? BoxesIcon;

  return (
    <div
      className={cn(
        "canvas-drawer-card",
        meta.variant ? "canvas-drawer-card--text" : "canvas-drawer-card--default"
      )}
    >
      {meta.variant ? (
        <span
          className={cn(
            "block truncate",
            meta.variant === "heading" && "text-[2rem] font-bold tracking-[-0.05em]",
            meta.variant === "subheading" && "text-[1.35rem] tracking-[-0.03em]",
            meta.variant === "body" && "text-base"
          )}
          style={{
            fontFamily:
              meta.variant === "heading"
                ? "var(--font-canvas-heading), var(--font-system), sans-serif"
                : meta.variant === "subheading"
                  ? "var(--font-canvas-subheading), var(--font-system), sans-serif"
                  : "var(--font-canvas-body), var(--font-system), sans-serif",
          }}
        >
          {meta.label}
        </span>
      ) : (
        <>
          <div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-muted/45 text-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{meta.label}</p>
            {meta.description ? (
              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                {meta.description}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

const canvasPuckOverrides: Partial<Overrides<typeof canvasPuckConfig>> = {
  drawerItem: ({ name }) => <CanvasDrawerItem name={name} />,
};

function getFrameSummaries(document: CanvasDocument): FrameSummary[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item) => ({
      id: item.props.id,
      title: item.props.title,
    }));
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function createShareSlug() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase();
}

function withCanvasTitle(document: CanvasDocument, title: string): CanvasDocument {
  return {
    ...document,
    root: {
      ...document.root,
      props: {
        ...document.root?.props,
        subject: document.root?.props?.subject ?? "computer_science",
        title,
      },
    },
  };
}

function buildCanvasPayload({
  activeFrameId,
  document,
  templateKey,
  title,
  topic,
}: {
  activeFrameId: string | null;
  document: CanvasDocument;
  templateKey: CanvasTemplateKey | null;
  title: string;
  topic: string | null;
}) {
  return {
    active_frame_id: activeFrameId,
    document,
    status: "draft",
    subject: "computer_science",
    template_key: templateKey,
    title,
    topic,
  };
}

export function CanvasPageClient({
  initialCanvas = null,
  initialCanvases = [],
}: CanvasPageClientProps) {
  const router = useRouter();
  const defaultTemplate = useMemo(() => createCanvasTemplate("array-intro"), []);
  const defaultDocument = useMemo(
    () => normalizeCanvasFrames(initialCanvas?.document ?? defaultTemplate.document),
    [defaultTemplate.document, initialCanvas?.document]
  );
  const { resolvedTheme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [isDesktop, setIsDesktop] = useState(false);
  const [canvasDocument, setCanvasDocument] = useState<CanvasDocument>(defaultDocument);
  const canvasDocumentRef = useRef(defaultDocument);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    initialCanvas?.activeFrameId ?? getInitialSlideId(defaultDocument)
  );
  const activeCanvasId = initialCanvas?.id ?? null;
  const activeTemplateKey = initialCanvas?.templateKey ?? "array-intro";
  const activeTopic = initialCanvas?.topic ?? "";
  const [shareSlug, setShareSlug] = useState<string | null>(initialCanvas?.shareSlug ?? null);
  const [isPublic, setIsPublic] = useState(initialCanvas?.isPublic ?? false);
  const [canvasRecords, setCanvasRecords] = useState<CanvasSummary[]>(initialCanvases);
  const [puckRevision, setPuckRevision] = useState(0);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState(initialCanvas?.topic ?? "");
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<CanvasTemplateKey>(initialCanvas?.templateKey ?? "array-intro");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [toolPanelOpen, setToolPanelOpen] = useState(true);
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>("home");
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    initialCanvas ? `Last saved ${formatUpdatedAt(initialCanvas.updatedAt)}` : "Library view"
  );
  const [commandDraft, setCommandDraft] = useState(
    '{ "action": "set_array_values", "values": ["10", "20", "30"] }'
  );
  const [commandError, setCommandError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogItem[]>([
    {
      id: "initial",
      message: initialCanvas
        ? `Opened ${initialCanvas.title}.`
        : "Canvas library loaded. Pick a canvas or create a new one.",
    },
  ]);

  const isLibraryView = !activeCanvasId;
  const frames = getFrameSummaries(canvasDocument);
  const screenContext = summarizeCanvas(canvasDocument, activeSlideId);
  const isLightTheme = resolvedTheme === "light";
  const showToolPanel = isDesktop && toolPanelOpen;
  const showAiPanel = isDesktop && aiPanelOpen;
  const filteredTemplates = canvasTemplateOptions.filter((template) => {
    const query = topicSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return `${template.title} ${template.description}`.toLowerCase().includes(query);
  });
  const gridTemplateColumns = [
    "72px",
    showToolPanel ? "clamp(240px, 22vw, 304px)" : "",
    "minmax(0, 1fr)",
    showAiPanel ? "clamp(280px, 24vw, 352px)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();
    mediaQuery.addEventListener("change", syncDesktopState);

    return () => mediaQuery.removeEventListener("change", syncDesktopState);
  }, []);

  useEffect(() => {
    canvasDocumentRef.current = canvasDocument;
  }, [canvasDocument]);

  useEffect(() => {
    if (!activeSlideId || isLibraryView) {
      return;
    }

    window.document
      .getElementById(`canvas-slide-${activeSlideId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [activeSlideId, isLibraryView, puckRevision]);

  const appendLog = (message: string) => {
    setActionLog((items) => [{ id: crypto.randomUUID(), message }, ...items].slice(0, 8));
  };

  const updateCanvasSummary = (nextSummary: CanvasSummary) => {
    setCanvasRecords((items) => {
      const existing = items.some((item) => item.id === nextSummary.id);
      const nextItems = existing
        ? items.map((item) => (item.id === nextSummary.id ? nextSummary : item))
        : [nextSummary, ...items];

      return nextItems.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    });
  };

  async function persistCanvas(nextDocument = canvasDocument) {
    if (!activeCanvasId) {
      return;
    }

    const supabase = createSupabaseClient();
    const title = nextDocument.root?.props?.title?.trim() || "Untitled canvas";
    const payload = buildCanvasPayload({
      activeFrameId: activeSlideId,
      document: nextDocument,
      templateKey: activeTemplateKey,
      title,
      topic: activeTopic.trim() || title,
    });

    const { data, error } = await supabase
      .from("teaching_canvases")
      .update(payload)
      .eq("id", activeCanvasId)
      .select("id, title, subject, template_key, updated_at, status, share_slug, is_public, topic")
      .single();

    if (error) {
      setSaveStatus("Save failed");
      appendLog("Could not save the canvas draft.");
      return;
    }

    setCanvasDocument(nextDocument);
    setSaveStatus(`Last saved ${formatUpdatedAt(data.updated_at)}`);
    updateCanvasSummary({
      id: data.id,
      isPublic: Boolean(data.is_public),
      shareSlug: data.share_slug ?? null,
      status: (data.status as CanvasSummary["status"]) ?? "draft",
      subject: "computer_science",
      templateKey: (data.template_key as CanvasTemplateKey | null) ?? null,
      title: data.title,
      topic: data.topic ?? null,
      updatedAt: data.updated_at,
    });
    appendLog("Saved the canvas draft.");
  }

  const debouncedPersistTitle = useDebouncedCallback(
    (nextTitle: string) => {
      if (!activeCanvasId) {
        return;
      }

      void persistCanvas(withCanvasTitle(canvasDocumentRef.current, nextTitle));
    },
    700,
    { maxWait: 2000 }
  );

  useEffect(() => {
    return () => {
      debouncedPersistTitle.flush();
    };
  }, [debouncedPersistTitle]);

  const handleCanvasTitleChange = (nextTitle: string) => {
    setCanvasDocument((current) => withCanvasTitle(current, nextTitle));
    setSaveStatus("Unsaved changes");
    debouncedPersistTitle(nextTitle);
  };

  const applyAction = (action: CanvasAiAction) => {
    const result = applyCanvasAction(canvasDocument, activeSlideId, action);
    setCanvasDocument(result.document);
    setActiveSlideId(result.activeSlideId);
    setAiPanelOpen(true);
    setPuckRevision((revision) => revision + 1);
    setCommandError(null);
    setSaveStatus("Unsaved changes");
    appendLog(result.message);
  };

  const createCanvasFromTemplate = async () => {
    setTemplateError(null);
    const template = createCanvasTemplate(selectedTemplateKey);
    const nextDocument = normalizeCanvasFrames(template.document);
    const title = topicSearch.trim() || template.title;
    const topic = topicSearch.trim() || template.title;
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setTemplateError("Please sign in again before creating a canvas.");
      return;
    }

    const payload = buildCanvasPayload({
      activeFrameId: getInitialSlideId(nextDocument),
      document: nextDocument,
      templateKey: selectedTemplateKey,
      title,
      topic,
    });

    const { data, error } = await supabase
      .from("teaching_canvases")
      .insert({
        ...payload,
        owner_id: user.id,
        share_slug: createShareSlug(),
      })
      .select("id")
      .single();

    if (error || !data) {
      setTemplateError(error?.message ?? "Could not create the canvas yet.");
      console.error("Error creating canvas:", error);
      return;
    }

    appendLog(`Created ${title}.`);
    setIsTemplateDialogOpen(false);
    startTransition(() => router.push(`/dashboard/canvas/${data.id}`));
  };

  const runJsonCommand = () => {
    try {
      const parsed = JSON.parse(commandDraft) as CanvasAiAction;
      applyAction(parsed);
    } catch {
      setCommandError("Command must be valid JSON for now.");
    }
  };

  const handleCreatePublicLink = async () => {
    if (!activeCanvasId) {
      return;
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("teaching_canvases")
      .update({ is_public: true })
      .eq("id", activeCanvasId)
      .select("share_slug, is_public")
      .single();

    if (error || !data?.share_slug) {
      setShareError("Could not create a public link yet.");
      return;
    }

    setShareSlug(data.share_slug);
    setIsPublic(Boolean(data.is_public));
    setShareError(null);
    appendLog("Created a public link for this canvas.");
  };

  const getPublicLink = () => {
    if (!shareSlug || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/canvas/shared/${shareSlug}`;
  };

  const copyPublicLink = async () => {
    const publicLink = getPublicLink();

    if (!publicLink) {
      return;
    }

    await navigator.clipboard.writeText(publicLink);
    appendLog("Copied the public link.");
  };

  const downloadAsPdf = () => {
    const previewElement = window.document.querySelector(
      ".canvas-preview-pane [data-puck-preview]"
    ) as HTMLElement | null;

    if (!previewElement) {
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
    if (!printWindow) {
      return;
    }

    const styles = Array.from(
      window.document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((node) => node.outerHTML)
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${canvasDocument.root?.props?.title ?? "Canvas export"}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 24px; background: #edf0f5; }
          </style>
        </head>
        <body>${previewElement.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleFrameChromeAction = (event: MouseEvent<HTMLElement>) => {
    const actionTarget = (event.target as HTMLElement).closest(
      "[data-canvas-frame-action]"
    ) as HTMLElement | null;

    if (!actionTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const frameId = actionTarget.dataset.canvasFrameId;
    const frameAction = actionTarget.dataset.canvasFrameAction;

    if (frameAction === "add") {
      applyAction({ action: "add_frame" });
    }

    if (frameAction === "add-below") {
      applyAction({ action: "add_frame_below", frameId });
    }

    if (frameAction === "duplicate") {
      applyAction({ action: "duplicate_frame", frameId });
    }

    if (frameAction === "delete") {
      applyAction({ action: "delete_frame", frameId });
    }
  };

  if (isLibraryView) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Canvas library
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Teaching canvases</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
              onClick={() => setTheme(isLightTheme ? "dark" : "light")}
            >
              {isLightTheme ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
            </Button>
            <Button onClick={() => setIsTemplateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New canvas
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Existing canvases</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open an existing lesson canvas or start a new one.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{canvasRecords.length} total</p>
            </div>

            <div className="grid gap-2">
              {canvasRecords.length ? (
                canvasRecords.map((canvas) => (
                  <button
                    key={canvas.id}
                    type="button"
                    onClick={() => startTransition(() => router.push(`/dashboard/canvas/${canvas.id}`))}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{canvas.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {canvas.topic || "Computer Science"} · {formatUpdatedAt(canvas.updatedAt)}
                      </p>
                    </div>
                    <LayoutPanelTopIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6">
                  <p className="text-sm font-semibold">No canvases yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start with a topic, then pick a template and we will open the editor directly.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* <aside className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-sm font-semibold">New canvas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Search a topic first, then choose a starter template.
            </p>
            <div className="mt-4 grid gap-3">
              <Label htmlFor="library-topic-search">Search topic or subject</Label>
              <Input
                id="library-topic-search"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder="Arrays, linked list, recursion, complexity..."
              />
              <Button onClick={() => setIsTemplateDialogOpen(true)}>
                <SparklesIcon className="size-4" />
                Pick template
              </Button>
              {templateError ? <p className="text-sm text-destructive">{templateError}</p> : null}
            </div>
          </aside> */}
        </div>

        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create canvas</DialogTitle>
              <DialogDescription>
                Search a Computer Science topic, then choose the template that should open in the
                editor.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-6 pb-2">
              <div className="grid gap-2">
                <Label htmlFor="canvas-topic-search">Topic search</Label>
                <Input
                  id="canvas-topic-search"
                  value={topicSearch}
                  onChange={(event) => setTopicSearch(event.target.value)}
                  placeholder="Search topic or subject"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateKey === template.key;

                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(template.key)}
                      className={cn(
                        "min-h-36 rounded-xl border p-4 text-left transition hover:bg-accent",
                        isSelected
                          ? "border-primary bg-primary/8 ring-2 ring-primary/18"
                          : "border-border bg-background"
                      )}
                    >
                      <p className="font-semibold tracking-tight">{template.title}</p>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {templateError ? <p className="text-sm text-destructive">{templateError}</p> : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createCanvasFromTemplate} disabled={isPending}>
                {isPending ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                Open editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <Puck<typeof canvasPuckConfig>
        key={`canvas-${puckRevision}`}
        config={canvasPuckConfig}
        data={canvasDocument}
        height="100%"
        iframe={{ enabled: false }}
        overrides={canvasPuckOverrides}
        onChange={(nextDocument) => {
          setCanvasDocument(normalizeCanvasFrames(nextDocument));
          setSaveStatus("Unsaved changes");
        }}
        onPublish={(nextDocument) => {
          void persistCanvas(nextDocument);
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              {isTitleEditing ? (
                <Input
                  autoFocus
                  value={canvasDocument.root?.props?.title ?? "Untitled canvas"}
                  onBlur={() => {
                    setIsTitleEditing(false);
                    debouncedPersistTitle.flush();
                  }}
                  onChange={(event) => handleCanvasTitleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setIsTitleEditing(false);
                      debouncedPersistTitle.flush();
                    }
                  }}
                  className="h-8 max-w-sm text-sm font-semibold"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTitleEditing(true)}
                  className="truncate text-left text-sm font-semibold transition hover:text-primary"
                >
                  {canvasDocument.root?.props?.title ?? "Untitled canvas"}
                </button>
              )}
              <p className="text-xs text-muted-foreground">{saveStatus}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void persistCanvas()}>
                <SaveIcon className="size-4" />
                Save draft
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                <Share2Icon className="size-4" />
                Share
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
                onClick={() => setTheme(isLightTheme ? "dark" : "light")}
              >
                {isLightTheme ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={aiPanelOpen ? "Collapse inspector" : "Expand inspector"}
                onClick={() => setAiPanelOpen((open) => !open)}
              >
                <PanelRightIcon className="size-4" />
              </Button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns }}>
            <aside className="flex min-h-0 flex-col items-center gap-2 overflow-y-auto border-r border-border bg-muted/20 px-2 py-3">
              <button
                type="button"
                aria-label="Back to dashboard"
                onClick={() => startTransition(() => router.push("/dashboard"))}
                className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-accent"
              >
                <Image
                  src="/unlockpi-logo.png"
                  alt="Unlock PI"
                  width={28}
                  height={28}
                  className="size-7 rounded-md object-cover"
                />
              </button>

              {leftPanelItems.map((item) => (
                <Button
                  key={item.id}
                  aria-label={item.label}
                  size="icon"
                  title={item.label}
                  variant={leftPanelView === item.id ? "secondary" : "ghost"}
                  className="h-10 w-full"
                  onClick={() => {
                    setLeftPanelView(item.id);
                    setToolPanelOpen(true);
                  }}
                >
                  <item.icon className="size-4" />
                </Button>
              ))}
            </aside>

            {showToolPanel ? (
              <aside className="min-h-0 border-r border-border bg-background lg:flex lg:flex-col">
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {leftPanelView === "home"
                          ? "Blocks"
                          : leftPanelView === "frames"
                            ? "Frames"
                            : leftPanelView === "changes"
                              ? "Recent changes"
                              : leftPanelView === "commands"
                                ? "Command JSON"
                                : leftPanelView === "voice"
                                  ? "Quick voice"
                                  : "Templates"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {leftPanelView === "home"
                          ? "Drag blocks into a frame"
                          : leftPanelView === "frames"
                            ? "Jump between frames quickly"
                            : leftPanelView === "changes"
                              ? "Track the latest edits on this canvas"
                              : leftPanelView === "commands"
                                ? "Run structured canvas commands"
                                : leftPanelView === "voice"
                                  ? "One-tap voice-style intents"
                                  : "Start a fresh canvas from a template"}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Collapse left panel"
                      onClick={() => setToolPanelOpen(false)}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {leftPanelView === "home" ? (
                    <div className="grid gap-5">
                      <div className="canvas-component-palette">
                        <Puck.Components />
                      </div>
                      {/* <div className="border-t border-border pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Canvases
                        </p>
                        <div className="grid gap-2">
                          {canvasRecords.map((canvas) => (
                            <button
                              key={canvas.id}
                              type="button"
                              onClick={() =>
                                startTransition(() => router.push(`/dashboard/canvas/${canvas.id}`))
                              }
                              className={cn(
                                "rounded-lg border p-2 text-left text-xs transition hover:bg-accent",
                                canvas.id === activeCanvasId
                                  ? "border-primary bg-primary/8"
                                  : "border-border bg-background"
                              )}
                            >
                              <span className="block truncate font-semibold">{canvas.title}</span>
                              <span className="mt-1 block truncate text-muted-foreground">
                                {canvas.topic || "Computer Science"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div> */}
                    </div>
                  ) : null}

                  {leftPanelView === "frames" ? (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => applyAction({ action: "add_frame" })}
                        className="flex min-h-11 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/8"
                      >
                        <span className="font-semibold">Add frame</span>
                        <PlusIcon className="size-4 text-muted-foreground" />
                      </button>

                      {frames.map((frame, index) => (
                        <button
                          key={frame.id}
                          type="button"
                          onClick={() => applyAction({ action: "go_to_frame", frameIndex: index })}
                          className={cn(
                            "rounded-lg border p-2 text-left text-xs transition hover:bg-accent",
                            activeSlideId === frame.id
                              ? "border-primary bg-primary/8"
                              : "border-border bg-background"
                          )}
                        >
                          <span className="font-semibold">Frame {index + 1}</span>
                          <span className="mt-1 block truncate text-muted-foreground">
                            {frame.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {leftPanelView === "changes" ? (
                    <div className="grid gap-2">
                      {actionLog.map((item) => (
                        <p
                          key={item.id}
                          className="rounded-lg border border-border bg-muted/30 p-2 text-xs"
                        >
                          {item.message}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {leftPanelView === "commands" ? (
                    <div className="grid gap-3">
                      <Label htmlFor="canvas-command-left">Command JSON</Label>
                      <Textarea
                        id="canvas-command-left"
                        value={commandDraft}
                        onChange={(event) => setCommandDraft(event.target.value)}
                        className="min-h-36 font-mono text-xs"
                      />
                      {commandError ? (
                        <p className="text-xs text-destructive">{commandError}</p>
                      ) : null}
                      <Button onClick={runJsonCommand}>
                        <BracesIcon className="size-4" />
                        Run command
                      </Button>
                    </div>
                  ) : null}

                  {leftPanelView === "voice" ? (
                    <div className="grid gap-2">
                      {quickCommands.map((command) => (
                        <Button
                          key={command.label}
                          variant="outline"
                          className="justify-start"
                          onClick={() => applyAction(command.action)}
                        >
                          {command.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {leftPanelView === "templates" ? (
                    <div className="grid gap-2">
                      {canvasTemplateOptions.map((template) => (
                        <button
                          key={template.key}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateKey(template.key);
                            setTopicSearch(template.title);
                            setIsTemplateDialogOpen(true);
                          }}
                          className="rounded-xl border border-border bg-background p-3 text-left transition hover:bg-accent"
                        >
                          <p className="text-sm font-semibold">{template.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {template.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </aside>
            ) : null}

            <main
              className="canvas-preview-pane min-h-0 overflow-x-hidden overflow-y-auto bg-[#edf0f5] dark:bg-[#050607]"
              onClick={handleFrameChromeAction}
              onDoubleClickCapture={() => setAiPanelOpen(true)}
            >
              <div className="box-border h-full min-h-full py-4">
                <Puck.Preview />
              </div>
            </main>

            {showAiPanel ? (
              <aside className="min-h-0 border-l border-border bg-background lg:flex lg:flex-col">
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BotIcon className="size-4 text-primary" />
                      <p className="text-sm font-semibold">Inspector</p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Collapse inspector"
                      onClick={() => setAiPanelOpen(false)}
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit the selected block and review live screen context.
                  </p>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Selected block
                    </div>
                    <div className="p-3">
                      <Puck.Fields />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="screen-context">Screen context</Label>
                    <Textarea
                      id="screen-context"
                      readOnly
                      value={screenContext}
                      className="min-h-32 text-xs"
                    />
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </Puck>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create canvas</DialogTitle>
            <DialogDescription>
              Search a Computer Science topic, then choose the template that should open in the
              editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-6 pb-2">
            <div className="grid gap-2">
              <Label htmlFor="canvas-topic-search-editor">Topic search</Label>
              <Input
                id="canvas-topic-search-editor"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder="Search topic or subject"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateKey === template.key;

                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => setSelectedTemplateKey(template.key)}
                    className={cn(
                      "min-h-36 rounded-xl border p-4 text-left transition hover:bg-accent",
                      isSelected
                        ? "border-primary bg-primary/8 ring-2 ring-primary/18"
                        : "border-border bg-background"
                    )}
                  >
                    <p className="font-semibold tracking-tight">{template.title}</p>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createCanvasFromTemplate} disabled={isPending}>
              {isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              New canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share canvas</DialogTitle>
            <DialogDescription>
              Share to create a public link, or export the full canvas as a PDF from the browser.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold">Share to create a public link</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Turn this canvas into a public read-only link for teaching and review.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => void handleCreatePublicLink()}>
                  <Share2Icon className="size-4" />
                  {isPublic ? "Refresh public link" : "Create public link"}
                </Button>
                {shareSlug ? (
                  <Button variant="outline" onClick={() => void copyPublicLink()}>
                    <CopyIcon className="size-4" />
                    Copy link
                  </Button>
                ) : null}
              </div>
              {shareSlug ? (
                <Input className="mt-3" readOnly value={getPublicLink()} />
              ) : null}
              {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold">Download as PDF</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This opens the browser print flow so you can save the full canvas as a PDF.
              </p>
              <Button className="mt-3" variant="outline" onClick={downloadAsPdf}>
                <SaveIcon className="size-4" />
                Download as PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
