import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  UploadCloud, FileText, Trash2, Loader2, CheckCircle2, XCircle, Clock, File,
} from "lucide-react";
import ConnectorsBar from "@/components/ConnectorsBar";
import { formatBytes } from "@/lib/format";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.pptx";

const statusMap = {
  ready: { icon: CheckCircle2, cls: "text-emerald-400", label: "Ready" },
  processing: { icon: Loader2, cls: "text-amber-400 animate-spin", label: "Processing" },
  failed: { icon: XCircle, cls: "text-red-400", label: "Failed" },
};

export default function KnowledgeBase() {
  const qc = useQueryClient();
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await api.get("/documents")).data,
  });

  const upload = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return (await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: (d) => {
      toast.success(`"${d.filename}" processed — ${d.chunk_count} chunks indexed`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Upload failed"),
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/documents/${id}`)).data,
    onSuccess: () => {
      toast.success("Document removed");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const handleFiles = (files) => {
    Array.from(files).forEach((f) => upload.mutate(f));
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Knowledge</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Knowledge Base</h1>
        <p className="text-sm text-zinc-400 mt-2">Upload documents to power grounded, cited AI answers.</p>
      </div>

      <ConnectorsBar />

      <div
        data-testid="upload-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
          dragging ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 hover:border-amber-500/50 bg-[#121214] hover:bg-amber-500/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          data-testid="file-input"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud className="w-10 h-10 text-zinc-600 group-hover:text-amber-500 mb-4 transition-colors" />
        <div className="text-base font-semibold text-zinc-200 mb-1">
          {upload.isPending ? "Uploading & indexing…" : "Drop files or click to upload"}
        </div>
        <div className="text-xs text-zinc-500">PDF · DOCX · TXT · Markdown · CSV · PPTX — up to 15MB</div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-zinc-100">Documents ({docs.length})</h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-md bg-zinc-900/60 border border-zinc-800 animate-pulse" />)}</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 border border-zinc-800 rounded-lg bg-[#121214]">
            <File className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <div className="text-sm text-zinc-400">No documents yet. Upload your first file above.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => {
              const s = statusMap[d.status] || statusMap.processing;
              return (
                <div key={d.id} data-testid="document-row" className="flex items-center gap-4 p-4 bg-[#121214] border border-zinc-800 rounded-md hover:border-zinc-600 transition-colors">
                  <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">{d.filename}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span className="uppercase">{d.file_type}</span>·<span>{formatBytes(d.size)}</span>·<span>{d.chunk_count} chunks</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${s.cls}`}>
                    <s.icon className="w-3.5 h-3.5" /> {s.label}
                  </div>
                  <button
                    data-testid="delete-document-button"
                    onClick={() => del.mutate(d.id)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
