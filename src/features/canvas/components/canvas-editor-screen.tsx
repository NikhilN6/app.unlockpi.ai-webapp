"use client";

import "@puckeditor/core/puck.css";

import { Puck } from "@puckeditor/core";
import { AnimatePresence } from "motion/react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { CanvasEditorHeader } from "@/features/canvas/components/editor/canvas-editor-header";
import { CanvasEditorInspectorPanel } from "@/features/canvas/components/editor/canvas-editor-inspector-panel";
import { CanvasEditorLeftMicroRail } from "@/features/canvas/components/editor/canvas-editor-left-micro-rail";
import { CanvasEditorLeftPanel } from "@/features/canvas/components/editor/canvas-editor-left-panel";
import { CanvasShareDialog } from "@/features/canvas/components/editor/canvas-share-dialog";
import { CanvasPresenter } from "@/features/canvas/components/canvas-presenter";
import { CanvasVoiceRoom } from "@/features/canvas/components/canvas-voice-room";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import {
  canvasPuckOverrides,
  getCanvasAppThemeVars,
} from "@/features/canvas/components/canvas-puck-overrides";
import { useCanvasEditorController } from "@/features/canvas/hooks/use-canvas-editor-controller";
import type { CanvasEditorPageModel } from "@/features/canvas/types/canvas-other-types";
import { cn } from "@/lib/utils";

type CanvasEditorScreenProps = {
  model: CanvasEditorPageModel;
};

export function CanvasEditorScreen({ model }: CanvasEditorScreenProps) {
  const controller = useCanvasEditorController(model);

  return (
    <section
      aria-label="Canvas editor"
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      {/*
        Lives OUTSIDE the <Puck key={puckRevision}> boundary below on
        purpose: an appearance change bumps that key, which unmounts and
        remounts the ENTIRE editor (header, sidebar, inspector, every
        frame) — if this overlay were inside it, it would vanish in the
        exact same remount it's meant to bridge. Sitting as a sibling means
        it survives the remount and stays visible for its whole duration.
      */}
      <div
        aria-hidden={!controller.isAppearancePending}
        className={cn(
          "pointer-events-none absolute inset-0 z-50 grid place-items-center bg-background/55 backdrop-blur-sm transition-opacity duration-150",
          controller.isAppearancePending ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-lg">
          <Spinner className="size-4" />
          Updating appearance…
        </div>
      </div>

      <CanvasVoiceRoom canvasId={model.canvas.id}>
        <Puck<typeof canvasPuckConfig>
        key={`canvas-${controller.puckRevision}`}
        config={canvasPuckConfig}
        data={controller.canvasDocument}
        height="100%"
        iframe={{ enabled: false }}
        overrides={canvasPuckOverrides}
        onChange={controller.actions.handlePuckChange}
        onPublish={(nextDocument) => {
          void controller.actions.persistCanvas(nextDocument);
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <CanvasEditorHeader
            actions={{
              commitCanvasTitle: controller.actions.commitCanvasTitle,
              flushTitleSave: controller.actions.flushTitleSave,
              handleCanvasTitleChange: controller.actions.handleCanvasTitleChange,
              persistCanvas: controller.actions.persistCanvas,
              setAiPanelOpen: controller.actions.setAiPanelOpen,
              setEasyMode: controller.actions.setEasyMode,
              setIsShareDialogOpen: controller.actions.setIsShareDialogOpen,
              setIsTitleEditing: controller.actions.setIsTitleEditing,
              setPresentationMode: controller.actions.setPresentationMode,
              toggleTheme: controller.actions.toggleTheme,
            }}
            aiPanelOpen={controller.aiPanelOpen}
            canvasDocument={controller.canvasDocument}
            canvasTitle={controller.canvasTitle}
            canvasTitleDraft={controller.canvasTitleDraft}
            easyMode={controller.easyMode}
            isLightTheme={controller.isLightTheme}
            isTitleEditing={controller.isTitleEditing}
            saveStatus={controller.saveStatus}
          />

          <div
            className="grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
            style={{ gridTemplateColumns: controller.gridTemplateColumns }}
          >
            <CanvasEditorLeftMicroRail
              actions={{
                setLeftPanelView: controller.actions.setLeftPanelView,
                setToolPanelOpen: controller.actions.setToolPanelOpen,
              }}
              easyMode={controller.easyMode}
              leftPanelView={controller.leftPanelView}
            />
            <CanvasEditorLeftPanel
              actionLog={controller.actionLog}
              actions={{
                applyAction: controller.actions.applyAction,
                getSketchScene: controller.actions.getSketchScene,
                runJsonCommand: controller.actions.runJsonCommand,
                setCommandDraft: controller.actions.setCommandDraft,
                setSketchScene: controller.actions.setSketchScene,
                updateCanvasAppearance:
                  controller.actions.updateCanvasAppearance,
              }}
              activeCanvasTheme={controller.activeCanvasTheme}
              activeFontFamily={controller.activeFontFamily}
              activeSlideId={controller.activeSlideId}
              activeTypographyScale={controller.activeTypographyScale}
              canvasDocument={controller.canvasDocument}
              commandDraft={controller.commandDraft}
              commandError={controller.commandError}
              frames={controller.frames}
              leftPanelView={controller.leftPanelView}
              show={controller.showToolPanel}
            />

            <main
              aria-label="Canvas stage"
              className="canvas-preview-pane min-h-0 overflow-hidden bg-background"
              style={getCanvasAppThemeVars(controller.isLightTheme)}
            >
              <ScrollArea className="h-full min-h-screen" scrollFade scrollbarGutter>
                <div
                  className="box-border min-h-full py-4"
                  onClick={controller.actions.handleFrameChromeAction}
                  onDoubleClickCapture={() => controller.actions.setAiPanelOpen(true)}
                >
                  <Puck.Preview />
                </div>
              </ScrollArea>
            </main>

            <CanvasEditorInspectorPanel
              actions={{
                setAiPanelOpen: controller.actions.setAiPanelOpen,
              }}
              easyMode={controller.easyMode}
              screenContext={controller.screenContext}
              show={controller.showAiPanel}
            />
          </div>
        </div>
        </Puck>
      </CanvasVoiceRoom>

      {/*
        AnimatePresence is what lets CanvasPresenter's `exit` animation
        actually play — without it, `controller.presentationMode` flipping to
        null would unmount the presenter synchronously mid-frame, same as
        before.
      */}
      <AnimatePresence>
        {controller.presentationMode ? (
          <CanvasPresenter
            canvasId={controller.activeCanvasId}
            document={controller.canvasDocument}
            initialFrameId={controller.activeSlideId}
            mode={controller.presentationMode}
            onClose={() => controller.actions.setPresentationMode(null)}
            title={controller.canvasTitle}
          />
        ) : null}
      </AnimatePresence>

      <CanvasShareDialog
        actions={{
          copyPublicLink: controller.actions.copyPublicLink,
          downloadAsPdf: controller.actions.downloadAsPdf,
          handleCreatePublicLink: controller.actions.handleCreatePublicLink,
          setIsShareDialogOpen: controller.actions.setIsShareDialogOpen,
        }}
        copySuccess={controller.copySuccess}
        isDownloadingPdf={controller.isDownloadingPdf}
        isPublic={controller.isPublic}
        isShareDialogOpen={controller.isShareDialogOpen}
        publicLink={controller.publicLink}
        shareError={controller.shareError}
        shareSlug={controller.shareSlug}
      />
    </section>
  );
}
