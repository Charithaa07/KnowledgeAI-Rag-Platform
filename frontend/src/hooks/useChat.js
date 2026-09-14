import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { streamChat } from "@/lib/streamChat";

const uid = () => `local_${Math.random().toString(36).slice(2)}`;

// Immutable update of the last (assistant) message in the list.
const patchLast = (patch) => (prev) => {
  if (!prev.length) return prev;
  const next = [...prev];
  next[next.length - 1] = { ...next[next.length - 1], ...patch(next[next.length - 1]) };
  return next;
};

// Append a user message + an empty assistant placeholder.
const withNewExchange = (text) => (prev) => [
  ...prev,
  { id: uid(), role: "user", content: text, citations: [] },
  { id: uid(), role: "assistant", content: "", citations: [] },
];

// Drop the trailing assistant + user pair (used when regenerating).
const dropLastExchange = (prev) => {
  const next = [...prev];
  if (next[next.length - 1]?.role === "assistant") next.pop();
  if (next[next.length - 1]?.role === "user") next.pop();
  return next;
};

// Encapsulates all conversation + streaming state and actions for the chat UI.
export function useChat() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [activeId, setActiveId] = useState(params.get("c") || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState("openai");
  const scrollRef = useRef();
  const lastUserMsg = useRef("");
  const skipLoadRef = useRef(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get("/chat/conversations")).data,
  });

  const loadMessages = useCallback(async (id) => {
    if (!id) { setMessages([]); return; }
    if (skipLoadRef.current === id) { skipLoadRef.current = null; return; }
    const res = await api.get(`/chat/conversations/${id}/messages`);
    setMessages(res.data);
  }, []);

  useEffect(() => { loadMessages(activeId); }, [activeId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const newConversation = useCallback(async () => {
    const res = await api.post("/chat/conversations", {});
    qc.invalidateQueries({ queryKey: ["conversations"] });
    skipLoadRef.current = res.data.id;
    setActiveId(res.data.id);
    setParams({ c: res.data.id });
    setMessages([]);
    return res.data.id;
  }, [qc, setParams]);

  const runStream = useCallback(async (convId, text) => {
    setStreaming(true);
    lastUserMsg.current = text;
    setMessages(withNewExchange(text));
    try {
      await streamChat({
        conversationId: convId,
        message: text,
        provider,
        onMeta: (d) => setMessages(patchLast(() => ({ citations: d.citations, model: d.model }))),
        onDelta: (chunk) => setMessages(patchLast((last) => ({ content: (last.content || "") + chunk }))),
        onError: (msg) => toast.error(msg),
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast.error("Streaming failed");
    } finally {
      setStreaming(false);
    }
  }, [provider, qc]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const convId = activeId || (await newConversation());
    runStream(convId, text);
  }, [input, streaming, activeId, newConversation, runStream]);

  const regenerate = useCallback(() => {
    if (streaming || !lastUserMsg.current) return;
    setMessages(dropLastExchange);
    runStream(activeId, lastUserMsg.current);
  }, [streaming, activeId, runStream]);

  const selectConversation = useCallback((id) => { setActiveId(id); setParams({ c: id }); }, [setParams]);

  const deleteConv = useCallback(async (id, e) => {
    e.stopPropagation();
    await api.delete(`/chat/conversations/${id}`);
    qc.invalidateQueries({ queryKey: ["conversations"] });
    if (id === activeId) { setActiveId(null); setMessages([]); setParams({}); }
  }, [qc, activeId, setParams]);

  return {
    conversations, activeId, messages, input, setInput, streaming, provider, setProvider,
    scrollRef, newConversation, send, regenerate, selectConversation, deleteConv,
  };
}
