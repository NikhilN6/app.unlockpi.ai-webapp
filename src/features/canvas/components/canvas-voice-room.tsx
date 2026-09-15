"use client";

import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useLiveKitRoomConnection } from "@/features/classroom/hooks/use-livekit-room-connection";
import {
  applyExcalidrawCommand,
  type ExcalidrawCommand,
  type ExcalidrawControllerApi,
} from "@/features/canvas/lib/excalidraw-controller";
import { useRpcHandler } from "@/features/talk/hooks/use-rpc-handler";

type VoiceState = {
  status: "off" | "connecting" | "listening" | "error";
  error: string | null;
  caption: string | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ 0: { transcript: string } }>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const VoiceContext = createContext<VoiceState | null>(null);
let activeApi: ExcalidrawControllerApi | null = null;

export const setCanvasExcalidrawApi = (api: ExcalidrawControllerApi | null) => {
  activeApi = api;
};

export const clearCanvasExcalidrawApi = (api: ExcalidrawControllerApi) => {
  if (activeApi === api) activeApi = null;
};

export const useCanvasVoice = () => useContext(VoiceContext);

function Bridge({
  children,
  connection,
}: {
  children: ReactNode;
  connection: ReturnType<typeof useLiveKitRoomConnection>;
}) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const latestSceneRef = useRef<Array<Record<string, unknown>> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [browserCaption, setBrowserCaption] = useState<string | null>(null);

  useRpcHandler("excalidraw.command", async (payload) => {
    if (!activeApi) return { success: false, error: "Excalidraw is not ready." };
    return applyExcalidrawCommand(activeApi, payload as ExcalidrawCommand);
  });
  useRpcHandler("caption.update", async (payload) => {
    const text = (payload as { text?: unknown })?.text;
    if (typeof text === "string") setCaption(text);
    return { success: true };
  });

  const agentIdentity = useMemo(
    () =>
      remoteParticipants.find(
        (participant) => participant.identity !== "teacher-interface",
      )?.identity,
    [remoteParticipants],
  );

  const syncScene = useCallback(
    (scene: Array<Record<string, unknown>> | null) => {
      if (!connection.token || !agentIdentity || !scene) return;

      void localParticipant
        .performRpc({
          destinationIdentity: agentIdentity,
          method: "excalidraw.sync",
          payload: JSON.stringify({ scene }),
          responseTimeout: 3_000,
        })
        .catch((error) => {
          console.warn("Could not sync the Excalidraw scene to the tutor.", error);
        });
    },
    [agentIdentity, connection.token, localParticipant],
  );

  const start = useCallback(() => void connection.connect(), [connection]);
  const stop = useCallback(() => {
    void localParticipant.setMicrophoneEnabled(false);
    connection.disconnect();
  }, [connection, localParticipant]);

  useEffect(() => {
    if (!connection.token) setCaption(null);
  }, [connection.token]);

  // LiveKit Agents can choose not to publish an STT text stream. Use the
  // browser's recognition API as a live-caption fallback so the teacher can
  // always see what was heard while speaking into the Draw Pad microphone.
  useEffect(() => {
    if (!connection.token) {
      setBrowserCaption(null);
      return;
    }

    const speechWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let active = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let text = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        text += event.results[index][0]?.transcript ?? "";
      }
      if (text.trim()) setBrowserCaption(text.trim());
    };
    recognition.onend = () => {
      if (active) {
        try {
          recognition.start();
        } catch {
          // A recognition restart can race with the browser's teardown.
        }
      }
    };
    recognition.onerror = () => {
      // Keep the last successful caption visible; the agent may still publish
      // a server-side final caption through the RPC above.
    };
    try {
      recognition.start();
    } catch {
      // Recognition may already be starting; onend will retry if needed.
    }

    return () => {
      active = false;
      recognition.stop();
    };
  }, [connection.token]);

  useEffect(() => {
    const sync = (event: Event) => {
      const scene = (event as CustomEvent).detail;
      if (!Array.isArray(scene)) return;

      latestSceneRef.current = scene as Array<Record<string, unknown>>;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(
        () => syncScene(latestSceneRef.current),
        700,
      );
    };

    window.addEventListener("excalidraw.scene", sync);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      window.removeEventListener("excalidraw.scene", sync);
    };
  }, [syncScene]);

  // A teacher can draw before the agent joins. Send that scene when the agent
  // arrives instead of requiring one more manual edit to trigger a sync.
  useEffect(() => {
    syncScene(latestSceneRef.current);
  }, [syncScene]);

  const value = useMemo<VoiceState>(
    () => ({
      status: connection.error
        ? "error"
        : connection.isConnecting
          ? "connecting"
          : connection.token
            ? "listening"
            : "off",
      error: connection.error,
      caption: browserCaption ?? caption,
      start,
      stop,
    }),
    [
      connection.error,
      connection.isConnecting,
      connection.token,
      start,
      stop,
      caption,
      browserCaption,
    ],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function CanvasVoiceRoom({
  canvasId,
  children,
}: {
  canvasId: string;
  children: ReactNode;
}) {
  const connection = useLiveKitRoomConnection({
    agentName: "UnlockPiCanvasDev",
    room: `canvas-${canvasId}`,
    username: "teacher-interface",
  });

  return (
    <LiveKitRoom
      audio
      className="flex h-full min-h-0 flex-1 flex-col"
      connect={Boolean(connection.token)}
      serverUrl={connection.serverUrl || undefined}
      token={connection.token || undefined}
    >
      <Bridge connection={connection}>{children}</Bridge>
    </LiveKitRoom>
  );
}
