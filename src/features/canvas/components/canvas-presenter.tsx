"use client";

import { Render } from "@puckeditor/core";
import {
  BotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStopIcon,
  ExpandIcon,
  Grid2X2Icon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  PowerIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import {
  type CanvasRealtimeAction,
  useCanvasRealtimeSession,
} from "@/features/canvas/hooks/use-canvas-realtime-session";
import {
  applyCanvasAction,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import { getCanvasPresentationFrames } from "@/features/canvas/lib/canvas-presentation";
import type {
  CanvasAiAction,
  CanvasDocument,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

export type CanvasPresentationMode = "manual" | "voice" | "companion";

type CanvasPresenterProps = {
  canvasId?: string | null;
  document: CanvasDocument;
  initialFrameId?: string | null;
  mode?: CanvasPresentationMode;
  onClose?: () => void;
  publicView?: boolean;
  title: string;
};

export function CanvasPresenter({
  canvasId,
  document: authoredDocument,
  initialFrameId,
  mode = "manual",
  onClose,
  publicView = false,
  title,
}: CanvasPresenterProps) {
  const [runtimeDocument, setRuntimeDocument] = useState(() =>
    structuredClone(authoredDocument),
  );
  const [selectedMode, setSelectedMode] =
    useState<CanvasPresentationMode>(mode);
  const [hasLiveChanges, setHasLiveChanges] = useState(false);
  const frames = useMemo(
    () => getCanvasPresentationFrames(runtimeDocument),
    [runtimeDocument],
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.id === initialFrameId),
    ),
  );
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pointerStartRef = useRef<number | null>(null);
  const presenterRef = useRef<HTMLDivElement | null>(null);
  const activeFrame = frames[activeIndex] ?? null;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (frames.length === 0) return;
      const boundedIndex = Math.min(Math.max(nextIndex, 0), frames.length - 1);
      setDirection(boundedIndex < activeIndex ? "backward" : "forward");
      setActiveIndex(boundedIndex);
      setOverviewOpen(false);
    },
    [activeIndex, frames.length],
  );

  const applyRealtimeAction = useCallback(
    (action: CanvasRealtimeAction) => {
      const navigationIndex = resolveNavigationIndex(
        action,
        frames,
        activeIndex,
      );
      if (navigationIndex !== null) {
        goTo(navigationIndex);
        const frame = frames[navigationIndex];
        return frame
          ? `Frame ${navigationIndex + 1} of ${frames.length}: ${frame.title}`
          : "No frame is available.";
      }

      const canvasAction = toCanvasAction(action);
      if (!canvasAction || !activeFrame) {
        return "The requested live visual change could not be applied.";
      }

      const result = applyCanvasAction(
        runtimeDocument,
        activeFrame.id,
        canvasAction,
      );
      const nextFrames = getCanvasPresentationFrames(result.document);
      setRuntimeDocument(result.document);
      setActiveIndex(
        Math.max(
          0,
          nextFrames.findIndex((frame) => frame.id === result.activeSlideId),
        ),
      );
      setHasLiveChanges(true);

      return `${result.message}\n${summarizeCanvas(result.document, result.activeSlideId)}`;
    },
    [activeFrame, activeIndex, frames, goTo, runtimeDocument],
  );

  const realtimeSession = useCanvasRealtimeSession({
    canvasId,
    canvasTitle: title,
    frames,
    mode: selectedMode === "companion" ? "companion" : "director",
    onAction: applyRealtimeAction,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(frames.length - 1);
      if (event.key === "Escape" && overviewOpen) setOverviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, frames.length, goTo, overviewOpen]);

  useEffect(() => {
    const syncFullscreen = () =>
      setIsFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      window.document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (window.document.fullscreenElement) {
      await window.document.exitFullscreen();
    } else {
      await presenterRef.current?.requestFullscreen();
    }
  };

  const selectMode = (nextMode: CanvasPresentationMode) => {
    if (nextMode === selectedMode) return;
    realtimeSession.disconnect();
    setSelectedMode(nextMode);
  };

  const resetLiveChanges = () => {
    const nextDocument = structuredClone(authoredDocument);
    const nextFrames = getCanvasPresentationFrames(nextDocument);
    const currentFrameId = activeFrame?.id;
    setRuntimeDocument(nextDocument);
    setActiveIndex(
      Math.max(
        0,
        nextFrames.findIndex((frame) => frame.id === currentFrameId),
      ),
    );
    setHasLiveChanges(false);
  };

  const endClass = () => {
    realtimeSession.disconnect();
    onClose?.();
  };

  if (!activeFrame) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#07090d] text-white">
        This canvas has no frames yet.
      </div>
    );
  }

  return (
    <div
      ref={presenterRef}
      className={cn(
        "canvas-presenter relative flex min-h-screen w-full flex-col overflow-hidden bg-[#07090d] text-white",
        !publicView && "fixed inset-0 z-[100]",
      )}
    >
      <header className="relative z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/45 px-4 py-2 backdrop-blur-xl sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-xs text-white/55">
            Frame {activeIndex + 1} of {frames.length} / {activeFrame.title}
          </p>
        </div>

        {!publicView ? (
          <div className="order-3 flex w-full items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 md:order-none md:w-auto">
            <ModeButton
              active={selectedMode === "manual"}
              label="Manual"
              onClick={() => selectMode("manual")}
            />
            <ModeButton
              active={selectedMode === "voice"}
              icon={<MicIcon className="size-3.5" />}
              label="Voice Director"
              onClick={() => selectMode("voice")}
            />
            <ModeButton
              active={selectedMode === "companion"}
              icon={<BotIcon className="size-3.5" />}
              label="AI Companion"
              onClick={() => selectMode("companion")}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          {!publicView && selectedMode !== "manual" ? (
            <RealtimeControls session={realtimeSession} />
          ) : null}
          {hasLiveChanges ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-amber-200 hover:bg-amber-300/10 hover:text-amber-100"
              aria-label="Reset temporary class changes"
              title="Reset temporary class changes"
              onClick={resetLiveChanges}
            >
              <RotateCcwIcon className="size-4" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="Open frame overview"
            onClick={() => setOverviewOpen((open) => !open)}
          >
            <Grid2X2Icon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? (
              <MinimizeIcon className="size-4" />
            ) : (
              <ExpandIcon className="size-4" />
            )}
          </Button>
          {onClose ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-red-200 hover:bg-red-400/12 hover:text-red-100"
              aria-label="End class"
              onClick={endClass}
            >
              <CircleStopIcon className="size-4" />
              <span className="hidden sm:inline">End class</span>
            </Button>
          ) : null}
        </div>
      </header>

      {hasLiveChanges ? (
        <div className="absolute left-1/2 top-[4.75rem] z-30 -translate-x-1/2 rounded-full border border-amber-300/20 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold text-amber-100 backdrop-blur-xl">
          Live-only changes · not saved to canvas
        </div>
      ) : null}

      <main
        className="relative grid min-h-0 flex-1 place-items-center overflow-hidden px-3 py-5 sm:px-10 sm:py-8"
        onPointerDown={(event) => {
          pointerStartRef.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStartRef.current === null) return;
          const distance = event.clientX - pointerStartRef.current;
          pointerStartRef.current = null;
          if (Math.abs(distance) < 70) return;
          goTo(activeIndex + (distance < 0 ? 1 : -1));
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(41,121,255,0.14),transparent_42%)]" />
        <div
          key={activeFrame.id}
          className={cn(
            "canvas-presenter-frame relative z-10 w-full max-w-6xl animate-in fade-in duration-300",
            direction === "forward"
              ? "slide-in-from-right-8"
              : "slide-in-from-left-8",
          )}
        >
          <Render config={canvasPuckConfig} data={activeFrame.document} />
        </div>

        <FrameArrow
          direction="previous"
          disabled={activeIndex === 0}
          onClick={() => goTo(activeIndex - 1)}
        />
        <FrameArrow
          direction="next"
          disabled={activeIndex === frames.length - 1}
          onClick={() => goTo(activeIndex + 1)}
        />
      </main>

      <footer className="relative z-20 flex h-12 shrink-0 items-center justify-center gap-1 bg-black/35 px-4 backdrop-blur-xl">
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            aria-label={`Go to frame ${frame.index + 1}`}
            onClick={() => goTo(frame.index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              frame.index === activeIndex
                ? "w-8 bg-white"
                : "w-2 bg-white/25 hover:bg-white/50",
            )}
          />
        ))}
      </footer>

      {realtimeSession.error ? (
        <div className="absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-full border border-red-400/30 bg-red-950/90 px-4 py-2 text-xs text-red-100 shadow-xl">
          {realtimeSession.error}
        </div>
      ) : null}

      {overviewOpen ? (
        <FrameOverview
          activeIndex={activeIndex}
          frames={frames}
          onClose={() => setOverviewOpen(false)}
          onSelect={goTo}
        />
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-white text-black"
          : "text-white/55 hover:bg-white/8 hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function RealtimeControls({
  session,
}: {
  session: ReturnType<typeof useCanvasRealtimeSession>;
}) {
  return (
    <div className="mr-1 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {!session.isConnected ? (
        <button
          type="button"
          disabled={session.status === "connecting"}
          onClick={() => void session.connect()}
          className="inline-flex h-8 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70"
        >
          <PowerIcon className="size-3.5" />
          {session.status === "connecting" ? "Connecting" : "Connect AI"}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={session.togglePause}
            className="grid size-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label={
              session.isPaused ? "Resume listening" : "Pause listening"
            }
          >
            {session.isPaused ? (
              <PlayIcon className="size-3.5" />
            ) : (
              <PauseIcon className="size-3.5" />
            )}
          </button>
          <span className="hidden items-center gap-1.5 px-1 text-[11px] font-semibold text-emerald-200 lg:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                session.isPaused
                  ? "bg-amber-300"
                  : "animate-pulse bg-emerald-300",
              )}
            />
            {session.isPaused ? "Paused" : "Live"}
          </span>
          <button
            type="button"
            onClick={session.disconnect}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-red-200 transition hover:bg-red-400/12"
          >
            <MicOffIcon className="size-3.5" />
            <span className="hidden xl:inline">Disconnect</span>
          </button>
        </>
      )}
    </div>
  );
}

function FrameArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "next" ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <button
      type="button"
      aria-label={`${direction === "next" ? "Next" : "Previous"} frame`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute z-20 grid size-11 place-items-center rounded-full border border-white/10 bg-black/35 text-white shadow-xl backdrop-blur-xl transition hover:bg-black/60 disabled:pointer-events-none disabled:opacity-20",
        direction === "next" ? "right-2 sm:right-5" : "left-2 sm:left-5",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function FrameOverview({
  activeIndex,
  frames,
  onClose,
  onSelect,
}: {
  activeIndex: number;
  frames: ReturnType<typeof getCanvasPresentationFrames>;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#07090d]/96 p-5 backdrop-blur-xl sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              Overview
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Choose a frame</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="Close frame overview"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => onSelect(frame.index)}
              className={cn(
                "group rounded-2xl border bg-white/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]",
                frame.index === activeIndex
                  ? "border-blue-400"
                  : "border-white/10",
              )}
            >
              <div className="mb-8 aspect-video rounded-xl bg-gradient-to-br from-white/12 to-white/[0.03] p-4">
                <span className="text-4xl font-semibold text-white/15">
                  {String(frame.index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs text-white/45">Frame {frame.index + 1}</p>
              <p className="mt-1 truncate font-semibold">{frame.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function resolveNavigationIndex(
  action: CanvasRealtimeAction,
  frames: ReturnType<typeof getCanvasPresentationFrames>,
  activeIndex: number,
) {
  if (action.action === "next")
    return Math.min(activeIndex + 1, frames.length - 1);
  if (action.action === "previous") return Math.max(activeIndex - 1, 0);
  if (action.action === "first") return 0;
  if (action.action === "last") return Math.max(frames.length - 1, 0);
  if (action.action === "goto" && action.frame_number) {
    return Math.min(Math.max(action.frame_number - 1, 0), frames.length - 1);
  }
  if (action.action === "find" && action.query) {
    const words = action.query.toLowerCase().split(/\s+/).filter(Boolean);
    const match = frames
      .map((frame) => ({
        frame,
        score: words.filter((word) => frame.searchText.includes(word)).length,
      }))
      .sort((left, right) => right.score - left.score)[0];
    return match?.score ? match.frame.index : activeIndex;
  }
  return null;
}

function toCanvasAction(action: CanvasRealtimeAction): CanvasAiAction | null {
  if (action.action === "add_array") {
    return {
      action: "add_array_block",
      title: action.title,
      values: action.values,
    };
  }
  if (action.action === "set_array") {
    return { action: "set_array_values", values: action.values ?? [] };
  }
  if (action.action === "resize_array") {
    return { action: "resize_array", length: action.length ?? 4 };
  }
  if (action.action === "highlight_array_index") {
    return { action: "highlight_array_index", index: action.index };
  }
  if (action.action === "clear_array_highlight") {
    return { action: "highlight_array_index" };
  }
  return null;
}
