import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, FileText, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);

  const search = useMutation({
    mutationFn: async (q) => (await api.post("/search", { query: q, top_k: 10 })).data,
    onSuccess: (d) => setResults(d.results),
  });

  const submit = (e) => {
    e.preventDefault();
    if (query.trim()) search.mutate(query.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Discover</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Semantic Search</h1>
        <p className="text-sm text-zinc-400 mt-2">Search meaning across every uploaded document.</p>
      </div>

      <form onSubmit={submit} className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          data-testid="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What is our refund policy?"
          className="w-full bg-[#121214] border border-zinc-800 rounded-md pl-11 pr-28 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors"
        />
        <button
          data-testid="search-button"
          type="submit"
          disabled={search.isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-md bg-amber-500 text-zinc-950 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {search.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {results !== null && (
        <div className="space-y-3" data-testid="search-results">
          {results.length === 0 ? (
            <div className="text-center py-16 text-sm text-zinc-500 border border-zinc-800 rounded-lg bg-[#121214]">
              No matches found. Upload documents in the Knowledge Base first.
            </div>
          ) : (
            results.map((r) => (
              <div key={`${r.document_id}-${r.chunk_index}`} data-testid="search-result-card" className="p-4 bg-[#121214] border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {r.filename}
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{(r.score * 100).toFixed(1)}% match</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, r.score * 100)}%` }} />
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-zinc-800 pl-3 italic">{r.snippet}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
