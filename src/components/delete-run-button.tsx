"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteRunButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        await fetch(`/api/runs/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="rounded-lg border border-transparent p-2 text-dim transition-colors hover:border-rose/30 hover:bg-rose/10 hover:text-rose disabled:opacity-40"
      aria-label="Delete run"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
