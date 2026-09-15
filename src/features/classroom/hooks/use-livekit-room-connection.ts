"use client";

import { useCallback, useMemo, useState } from "react";

interface UseLiveKitRoomConnectionOptions {
  room: string;
  username: string;
  sessionId?: string | null;
  agentName?: string;
  autoConnect?: boolean;
}

export function useLiveKitRoomConnection({
  room,
  username,
  sessionId,
  agentName,
}: UseLiveKitRoomConnectionOptions) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentWarning, setAgentWarning] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams({ room, username });
    if (sessionId) {
      searchParams.set("session_id", sessionId);
    }
    if (agentName) {
      searchParams.set("agent_name", agentName);
    }
    return searchParams.toString();
  }, [agentName, room, username, sessionId]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setAgentWarning(null);
    try {
      const response = await fetch(`/api/token?${queryString}`);
      const data = (await response.json()) as {
        accessToken?: string;
        serverUrl?: string;
        error?: string;
        agentDispatched?: boolean;
        agentDispatchError?: string;
      };
      if (data.error) {
        setError(data.error);
        setIsConnecting(false);
        return;
      }

      if (data.agentDispatched === false) {
        setAgentWarning(
          data.agentDispatchError ??
            "The AI tutor could not join this room. Try reconnecting.",
        );
      }

      setToken(data.accessToken ?? "");
      setServerUrl(data.serverUrl ?? "");
      setIsConnecting(false);
    } catch {
      setError("Failed to connect. Is the server running?");
      setIsConnecting(false);
    }
  }, [queryString]);

  const disconnect = useCallback(() => {
    setToken("");
    setServerUrl("");
    setIsConnecting(false);
    setError(null);
    setAgentWarning(null);
  }, []);

  return { token, serverUrl, isConnecting, error, agentWarning, connect, disconnect };
}
