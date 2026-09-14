import { useChat } from "@/hooks/useChat";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import MessageList from "@/components/chat/MessageList";
import ChatComposer from "@/components/chat/ChatComposer";
import { Sparkles } from "lucide-react";

const PROVIDERS = [
  { id: "openai", label: "GPT-4.1" },
  { id: "anthropic", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

function ModelSelector({ provider, setProvider }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-md" data-testid="model-selector">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          data-testid={`model-${p.id}`}
          onClick={() => setProvider(p.id)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            provider === p.id ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const {
    conversations, activeId, messages, input, setInput, streaming, provider, setProvider,
    scrollRef, newConversation, send, regenerate, selectConversation, deleteConv,
  } = useChat();

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConv}
      />

      <div className="flex-1 flex flex-col bg-[#09090B]">
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-zinc-200">RAG Assistant</span>
          </div>
          <ModelSelector provider={provider} setProvider={setProvider} />
        </div>

        <MessageList messages={messages} streaming={streaming} onRegenerate={regenerate} scrollRef={scrollRef} />
        <ChatComposer input={input} setInput={setInput} onSend={send} streaming={streaming} />
      </div>
    </div>
  );
}
