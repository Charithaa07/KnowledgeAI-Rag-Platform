import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Brain, Copy, RefreshCw, FileText, Check } from "lucide-react";
import { logError } from "@/lib/logger";

// Hoisted so identical references are reused across every render (no re-parsing).
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeHighlight];

function Citations({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2" data-testid="citations">
      {items.map((c) => (
        <span
          key={c.index}
          title={c.snippet}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
        >
          <FileText className="w-3 h-3" />[{c.index}] {c.filename}
          <span className="text-zinc-600">· {(c.score * 100).toFixed(0)}%</span>
        </span>
      ))}
    </div>
  );
}

function Message({ m, onRegenerate, canRegenerate }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      logError("Clipboard copy failed:", err);
    }
  };

  if (m.role === "user") {
    return (
      <div className="flex justify-end mb-6 animate-fadeup" data-testid="message-user">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 max-w-[80%] text-sm text-zinc-100 whitespace-pre-wrap">
          {m.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 gap-4 animate-fadeup" data-testid="message-ai">
      <div className="w-8 h-8 rounded-md bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
        <Brain className="w-4 h-4" />
      </div>
      <div className="max-w-[85%] min-w-0 flex-1">
        {m.content ? (
          <div className="prose-invert-custom text-sm">
            <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
              {m.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-1 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 dot-pulse" />
            <span className="w-2 h-2 rounded-full bg-amber-500 dot-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="w-2 h-2 rounded-full bg-amber-500 dot-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
        <Citations items={m.citations} />
        {m.content && (
          <div className="flex items-center gap-2 mt-2">
            <button data-testid="copy-message-button" onClick={copy} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
            </button>
            {canRegenerate && (
              <button data-testid="regenerate-button" onClick={onRegenerate} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            )}
            {m.model && <span className="text-xs text-zinc-600 font-mono ml-auto">{m.model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-14 h-14 rounded-lg bg-amber-500 flex items-center justify-center mb-5">
        <Brain className="w-7 h-7 text-zinc-950" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-zinc-50 mb-2">Ask your knowledge base</h2>
      <p className="text-sm text-zinc-500 max-w-md">
        Questions are answered using your uploaded documents with inline citations. Upload files in the
        Knowledge Base to get grounded answers.
      </p>
    </div>
  );
}

export default function MessageList({ messages, streaming, onRegenerate, scrollRef }) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m, i) => (
            <Message
              key={m.id || i}
              m={m}
              onRegenerate={onRegenerate}
              canRegenerate={!streaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))
        )}
      </div>
    </div>
  );
}
