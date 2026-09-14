import { API } from "@/lib/api";

function parseSSELine(line, handlers) {
  if (!line.startsWith("data: ")) return;
  const data = JSON.parse(line.slice(6));
  if (data.type === "meta") handlers.onMeta?.(data);
  else if (data.type === "delta") handlers.onDelta?.(data.content);
  else if (data.type === "error") handlers.onError?.(data.content);
}

// Consumes the SSE chat stream and dispatches typed events to callbacks.
export async function streamChat({ conversationId, message, provider, onMeta, onDelta, onError }) {
  const resp = await fetch(`${API}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ conversation_id: conversationId, message, provider }),
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const handlers = { onMeta, onDelta, onError };
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();
    lines.forEach((line) => parseSSELine(line, handlers));
  }
}
