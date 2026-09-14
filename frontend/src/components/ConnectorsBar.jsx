import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Github, Loader2, Plug, BookOpen, ArrowRight } from "lucide-react";

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-semibold text-zinc-500">{label}</label>
      <input
        {...props}
        className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors"
      />
    </div>
  );
}

export default function ConnectorsBar() {
  const qc = useQueryClient();
  const [ghOpen, setGhOpen] = useState(false);
  const [ntOpen, setNtOpen] = useState(false);
  const [gh, setGh] = useState({ owner: "", repo: "", branch: "main", token: "" });
  const [nt, setNt] = useState({ token: "" });

  const done = (label) => (d) => {
    toast.success(`${label}: ${d.files_synced} document(s), ${d.chunks_indexed} chunks indexed`);
    qc.invalidateQueries({ queryKey: ["documents"] });
    setGhOpen(false);
    setNtOpen(false);
  };
  const fail = (e) => toast.error(e?.response?.data?.detail || "Sync failed");

  const githubSync = useMutation({
    mutationFn: async () => (await api.post("/connectors/github/sync", {
      owner: gh.owner.trim(), repo: gh.repo.trim(), branch: gh.branch.trim() || "main",
      token: gh.token.trim() || undefined,
    })).data,
    onSuccess: done("GitHub"), onError: fail,
  });

  const notionSync = useMutation({
    mutationFn: async () => (await api.post("/connectors/notion/sync", { token: nt.token.trim() })).data,
    onSuccess: done("Notion"), onError: fail,
  });

  const cards = [
    {
      id: "github", name: "GitHub", icon: Github, testid: "connector-github",
      desc: "Sync .md, .txt, .pdf, .docx, .csv from a repository.",
      open: ghOpen, setOpen: setGhOpen,
    },
    {
      id: "notion", name: "Notion", icon: BookOpen, testid: "connector-notion",
      desc: "Import pages shared with your integration.",
      open: ntOpen, setOpen: setNtOpen,
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Plug className="w-4 h-4 text-amber-500" />
        <h3 className="font-heading font-semibold text-zinc-100">Connect a Source</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {cards.map((c) => (
          <Dialog key={c.id} open={c.open} onOpenChange={c.setOpen}>
            <DialogTrigger asChild>
              <button
                data-testid={c.testid}
                className="text-left flex items-center gap-4 p-4 bg-[#121214] border border-zinc-800 rounded-lg hover:border-amber-500/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5 text-zinc-300 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100">{c.name}</div>
                  <div className="text-xs text-zinc-500 truncate">{c.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-500" />
              </button>
            </DialogTrigger>

            <DialogContent className="bg-[#121214] border-zinc-800">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-zinc-50">
                  <c.icon className="w-5 h-5 text-amber-500" /> Connect {c.name}
                </DialogTitle>
                <DialogDescription className="text-zinc-500">{c.desc}</DialogDescription>
              </DialogHeader>

              {c.id === "github" ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Field data-testid="gh-owner" label="Owner" placeholder="e.g. facebook" value={gh.owner} onChange={(e) => setGh({ ...gh, owner: e.target.value })} />
                    <Field data-testid="gh-repo" label="Repository" placeholder="e.g. docs" value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field data-testid="gh-branch" label="Branch" placeholder="main" value={gh.branch} onChange={(e) => setGh({ ...gh, branch: e.target.value })} />
                    <Field data-testid="gh-token" label="Token (optional)" type="password" placeholder="for private repos" value={gh.token} onChange={(e) => setGh({ ...gh, token: e.target.value })} />
                  </div>
                  <button
                    data-testid="gh-sync-button"
                    onClick={() => githubSync.mutate()}
                    disabled={githubSync.isPending || !gh.owner || !gh.repo}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-zinc-950 font-medium text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {githubSync.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</> : "Sync Repository"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <Field data-testid="nt-token" label="Integration Token" type="password" placeholder="secret_..." value={nt.token} onChange={(e) => setNt({ token: e.target.value })} />
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Create an internal integration at notion.so/my-integrations, then share the pages you want to import with it.
                  </p>
                  <button
                    data-testid="nt-sync-button"
                    onClick={() => notionSync.mutate()}
                    disabled={notionSync.isPending || !nt.token}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-zinc-950 font-medium text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {notionSync.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</> : "Sync Workspace"}
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
