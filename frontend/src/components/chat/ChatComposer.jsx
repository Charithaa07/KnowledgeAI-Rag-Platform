import { Send, Loader2 } from "lucide-react";

export default function ChatComposer({ input, setInput, onSend, streaming }) {
  return (
    <div className="px-6 pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-2 focus-within:border-amber-500/50 transition-colors flex items-end gap-2">
          <textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask anything about your documents…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder-zinc-600 px-3 py-2 max-h-40"
          />
          <button
            data-testid="send-message-button"
            onClick={onSend}
            disabled={streaming || !input.trim()}
            className="w-9 h-9 rounded-md bg-amber-500 text-zinc-950 flex items-center justify-center hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-[11px] text-zinc-600 text-center mt-2">
          KnowledgeAI grounds answers in your documents · Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
