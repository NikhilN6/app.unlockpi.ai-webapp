/**
 * Token API route — generates a LiveKit access token for the user
 * AND dispatches the Pi AI agent to join the same room.
 * 
 * Without the agent dispatch, the user would connect to an empty room
 * because our agent uses explicit dispatch (agent_name="UnlockPi").
 */

import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Force Node runtime for this route (required by livekit-server-sdk).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const room = req.nextUrl.searchParams.get("room");
        const username = req.nextUrl.searchParams.get("username");
        const sessionId = req.nextUrl.searchParams.get("session_id");
        const requestedAgentName = req.nextUrl.searchParams.get("agent_name");
        const agentName = requestedAgentName === "UnlockPiCanvasDev"
            ? "UnlockPiCanvasDev"
            : "UnlockPi";
        if (!room) {
            return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
        } else if (!username) {
            return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        // Keep the LiveKit endpoint server-side. The client receives this
        // public WebSocket URL alongside its short-lived room token below.
        const wsUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error("[Token API] Missing LiveKit configuration:", { apiKey: !!apiKey, apiSecret: !!apiSecret, wsUrl: !!wsUrl });
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        // 1. Generate the access token for the user
        const at = new AccessToken(apiKey, apiSecret, { identity: username });
        at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

        // 2. Dispatch the AI agent to this room.
        // The user still gets a working room token even if this fails, but we
        // report the failure so the client can tell them the tutor never joined
        // instead of leaving them silently talking to an empty room.
        const httpUrl = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
        let agentDispatched = true;
        let agentDispatchError: string | undefined;
        try {
            const agentClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
            // Token refreshes and React development remounts may call this
            // endpoint more than once. Reusing the pending dispatch is vital:
            // multiple tutors in one room all receive the microphone, making
            // tool calls unreliable and duplicating spoken replies.
            const dispatches = await agentClient.listDispatch(room);
            const matchingDispatches = dispatches.filter(
                (dispatch) => dispatch.agentName === agentName,
            );
            // Job status values 0 and 1 are pending/running. A completed or
            // failed job cannot receive another voice turn, so remove its
            // stale dispatch before creating a replacement.
            const alreadyDispatched = matchingDispatches.some((dispatch) =>
                dispatch.state?.jobs.some(
                    (job) => job.state?.status === 0 || job.state?.status === 1,
                ),
            );
            if (!alreadyDispatched) {
                await Promise.all(
                    matchingDispatches.map((dispatch) =>
                        agentClient.deleteDispatch(dispatch.id, room),
                    ),
                );
                await agentClient.createDispatch(room, agentName, {
                    metadata: JSON.stringify({ session_id: sessionId }),
                });
                console.log(`[Token API] Dispatched agent "${agentName}" to room "${room}"`);
            } else {
                console.log(`[Token API] Reusing agent "${agentName}" in room "${room}"`);
            }
        } catch (err) {
            agentDispatched = false;
            agentDispatchError = "The AI tutor could not be dispatched to this room.";
            console.error("[Token API] Agent dispatch failed:", err);
        }

        const jwt = await at.toJwt();
        return NextResponse.json({
            accessToken: jwt,
            serverUrl: wsUrl,
            agentDispatched,
            ...(agentDispatchError ? { agentDispatchError } : {}),
        });
    } catch (err) {
        console.error("[Token API] Unexpected error:", err);
        return NextResponse.json({ error: String(err ?? "unknown") }, { status: 500 });
    }
}
