"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";

export default function CvHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const cvId = params.cvId as Id<"cvs">;

  const versions = useQuery(api.cvs.listCvVersions, { cvId });
  const setActiveVersion = useMutation(api.cvs.setActiveVersion);

  async function handleMakeLive(versionId: Id<"cvVersions">) {
    await setActiveVersion({ cvId, versionId });
    toast.success("This version is now live on the share link");
  }

  if (versions === undefined) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center text-muted-foreground">
        Loading history…
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-muted-foreground">
          No generations yet. Save &amp; generate this CV once to create the
          first version.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard/cvs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My CVs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Version history</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every time you save &amp; regenerate, a new version is kept. Pick
            which one is live on the public share link.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/cvs")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          My CVs
        </Button>
      </div>

      <div className="space-y-3">
        {versions.map((v) => {
          const created = new Date(v.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });

          return (
            <div
              key={v._id}
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                v.isActive
                  ? "border-purple-500/50 bg-purple-500/5"
                  : "border-zinc-900/10 dark:border-white/10 bg-white/60 dark:bg-white/5"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    v{v.versionNumber}
                    {v.label ? ` — ${v.label}` : ""}
                  </span>
                  {v.isActive && (
                    <Badge className="bg-purple-600 hover:bg-purple-600">
                      Live
                    </Badge>
                  )}
                  {v.matchScore != null && (
                    <Badge variant="secondary">Match {v.matchScore}%</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {created}
                  {v.style ? ` · ${v.style}` : ""}
                  {v.layout ? ` · ${v.layout}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {/* Optional: open a version preview route if you add one later */}
                {!v.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMakeLive(v._id)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Make live
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: change the target role or job description, then{" "}
        <Link
          href={`/dashboard/create?cvId=${cvId}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          edit &amp; regenerate
        </Link>{" "}
        — a new version appears here automatically.
      </p>
    </div>
  );
}
