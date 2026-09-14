import { Plus, MessagesSquare, Trash2 } from "lucide-react";

export default function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete }) {
  return (
    <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-[#0c0c0e]">
      <div className="p-3 border-b border-zinc-800">
        <button
          data-testid="new-conversation-button"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-zinc-950 font-medium text-sm hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-8">No conversations yet</div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            data-testid="conversation-item"
            onClick={() => onSelect(c.id)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors group ${
              c.id === activeId
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-zinc-400 hover:bg-zinc-900 border border-transparent"
            }`}
          >
            <MessagesSquare className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{c.title}</span>
            <Trash2
              data-testid="delete-conversation-button"
              onClick={(e) => onDelete(c.id, e)}
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
