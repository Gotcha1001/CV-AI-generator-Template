"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function JdUrlImport({
  onImported,
}: {
  onImported: (text: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleImport() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/jd/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't import that page.");
        return;
      }
      onImported(data.text);
      toast.success(
        data.truncated
          ? "Imported — long posting was trimmed, review below."
          : "Imported — review it below before saving.",
      );
      setOpen(false);
      setUrl("");
    } catch {
      toast.error(
        "Couldn't import that page. Try pasting the description instead.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
      >
        or paste a job posting URL instead
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://company.com/careers/senior-designer"
        type="url"
      />
      <Button type="button" size="sm" onClick={handleImport} disabled={loading}>
        {loading ? "Importing…" : "Import"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
