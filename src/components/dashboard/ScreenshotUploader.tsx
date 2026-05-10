"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type OcrResult = {
  imageUrl: string;
  extractedPoints: number | null;
  confidence: "high" | "low";
  matchedPattern: "chain" | "fallback" | "none";
  rawText?: string;
};

type Props = {
  chainSlug: string;
  onConfirm: (points: number, imageUrl?: string) => void;
};

type Stage = "idle" | "uploading" | "review" | "error";

const MAX_BYTES = 8 * 1024 * 1024;

export function ScreenshotUploader({ chainSlug, onConfirm }: Props) {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<OcrResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editedPoints, setEditedPoints] = React.useState<string>("");

  const reset = React.useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError(null);
    setEditedPoints("");
    setStage("idle");
  }, [preview]);

  const onDrop = React.useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        setError("That image is over 8 MB — try a smaller screenshot.");
        setStage("error");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setError(null);
      setStage("uploading");

      const form = new FormData();
      form.append("file", file);
      form.append("chainSlug", chainSlug);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Upload failed (${res.status})`);
        }
        const data: OcrResult = await res.json();
        setResult(data);
        setEditedPoints(data.extractedPoints?.toString() ?? "");
        setStage("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setStage("error");
      }
    },
    [chainSlug],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
    },
    maxFiles: 1,
    multiple: false,
    noClick: stage !== "idle",
    noKeyboard: stage !== "idle",
  });

  const points = Number(editedPoints);
  const canConfirm = Number.isFinite(points) && points > 0;
  const isHigh = result?.confidence === "high";

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          stage === "idle" && "cursor-pointer",
          isDragActive
            ? "border-[var(--accent)] bg-[rgba(245,158,11,0.06)]"
            : "border-[var(--border)] bg-[var(--bg-tertiary)]/40",
          stage === "idle" && !isDragActive && "hover:border-[var(--border-strong)]",
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.1)] text-[var(--accent)]">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {isDragActive ? "Drop it" : "Drop a rewards screenshot"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  PNG, JPG, HEIC up to 8 MB · we&apos;ll OCR the points number for you
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={open}>
                Browse files
              </Button>
            </motion.div>
          )}

          {stage === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Uploading"
                  className="max-h-32 rounded-xl border border-[var(--border)] object-contain opacity-50"
                />
              ) : null}
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Reading your balance…
              </p>
            </motion.div>
          )}

          {stage === "review" && result && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-col items-center gap-4"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Screenshot"
                  className="max-h-32 rounded-xl border border-[var(--border)] object-contain"
                />
              ) : null}
              <ConfidenceBadge confidence={result.confidence} matched={result.matchedPattern} />
              <div className="w-full max-w-xs space-y-2 text-left">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  We found this balance — looks right?
                </label>
                <Input
                  value={editedPoints}
                  onChange={(e) => setEditedPoints(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  className={cn(
                    "text-center font-mono-tabular text-2xl",
                    isHigh
                      ? "border-[rgba(34,197,94,0.4)] focus-visible:border-[var(--success)]"
                      : "border-[rgba(234,179,8,0.4)] focus-visible:border-[#facc15]",
                  )}
                />
              </div>
            </motion.div>
          )}

          {stage === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.1)] text-[var(--danger)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-sm text-[var(--danger)]">{error ?? "Something went wrong."}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {(stage === "review" || stage === "error") && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            aria-label="Reset"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {stage === "review" && result ? (
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try a different screenshot
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canConfirm}
            onClick={() => onConfirm(points, result.imageUrl)}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Use {points.toLocaleString()} points
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ConfidenceBadge({
  confidence,
  matched,
}: {
  confidence: "high" | "low";
  matched: "chain" | "fallback" | "none";
}) {
  if (matched === "none") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-2.5 py-1 text-xs text-[var(--danger)]">
        <AlertTriangle className="h-3 w-3" />
        Couldn&apos;t read the balance — type it in below
      </span>
    );
  }
  if (confidence === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-2.5 py-1 text-xs text-[var(--success)]">
        <CheckCircle2 className="h-3 w-3" />
        High confidence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] px-2.5 py-1 text-xs text-[#facc15]">
      <AlertTriangle className="h-3 w-3" />
      Low confidence — double-check the number
    </span>
  );
}
