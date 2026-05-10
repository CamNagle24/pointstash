"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Type, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { ScreenshotUploader } from "@/components/dashboard/ScreenshotUploader";
import { CHAIN_IDS, CHAINS } from "@/lib/constants";
import { hasImplementedConnector } from "@/lib/connectors";
import type { ChainId } from "@/types/chain";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type SyncMethod = "MANUAL" | "SCREENSHOT" | "API";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful POST /api/accounts so the parent can refetch. */
  onLinked?: () => void;
};

export function AddAccountModal({ open, onOpenChange, onLinked }: Props) {
  const [step, setStep] = React.useState<Step>(1);
  const [chainSlug, setChainSlug] = React.useState<ChainId | null>(null);
  const [memberId, setMemberId] = React.useState("");
  const [syncMethod, setSyncMethod] = React.useState<SyncMethod>("MANUAL");
  const [points, setPoints] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setChainSlug(null);
        setMemberId("");
        setSyncMethod("MANUAL");
        setPoints("");
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const submit = async (overridePoints?: number) => {
    if (!chainSlug) return;
    setSubmitting(true);
    const finalPoints = overridePoints ?? Number(points) ?? 0;
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainSlug,
          loyaltyId: memberId || undefined,
          currentPoints: finalPoints,
          syncMethod,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast({
            variant: "error",
            title: "Already linked",
            description: `You already have a ${CHAINS[chainSlug].name} account. Edit it from the Accounts page.`,
          });
          return;
        }
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      onLinked?.();
      setPoints(finalPoints.toString());
      next();
      toast({
        variant: "success",
        title: `${CHAINS[chainSlug].name} linked`,
        description: `${finalPoints.toLocaleString()} ${CHAINS[chainSlug].pointsSymbol} logged.`,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't link account",
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onScreenshotConfirm = (extracted: number) => {
    setSyncMethod("SCREENSHOT");
    setPoints(extracted.toString());
    submit(extracted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Link a rewards account</DialogTitle>
            <Stepper step={step} />
          </div>
          <DialogDescription>
            {step === 1 && "Choose the chain you want to track."}
            {step === 2 && "Tell us your current balance — manually or from a screenshot."}
            {step === 3 && "Account linked. You're stacking now."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-3 gap-3"
              >
                {CHAIN_IDS.map((id) => {
                  const c = CHAINS[id];
                  const active = chainSlug === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={c.name}
                      aria-pressed={active}
                      onClick={() => setChainSlug(id)}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                        active
                          ? "border-[var(--accent)] bg-[rgba(245,158,11,0.06)]"
                          : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]",
                      )}
                    >
                      <ChainLogo slug={id} size="lg" />
                      <p className="text-xs font-medium text-center">{c.name}</p>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {step === 2 && chainSlug && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
                  <ChainLogo slug={chainSlug} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium">{CHAINS[chainSlug].name}</p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      Logging {CHAINS[chainSlug].pointsName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memberId">
                    Your {CHAINS[chainSlug].name} Member ID{" "}
                    <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="memberId"
                    placeholder="e.g. CFA-29481, phone number, or email"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    Stored locally. Helps when you have multiple accounts on the same chain.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>How do you want to keep this updated?</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <MethodToggle
                      active={syncMethod === "MANUAL"}
                      onClick={() => setSyncMethod("MANUAL")}
                      icon={<Type className="h-4 w-4" />}
                      label="Manual"
                      hint="Type it in"
                    />
                    <MethodToggle
                      active={syncMethod === "SCREENSHOT"}
                      onClick={() => setSyncMethod("SCREENSHOT")}
                      icon={<Camera className="h-4 w-4" />}
                      label="Screenshot"
                      hint="OCR it"
                    />
                    <MethodToggle
                      active={syncMethod === "API"}
                      onClick={() => setSyncMethod("API")}
                      icon={<Zap className="h-4 w-4" />}
                      label="Auto-sync"
                      hint="Coming soon"
                      disabled={!hasImplementedConnector(chainSlug)}
                    />
                  </div>
                </div>

                {syncMethod === "MANUAL" && (
                  <div className="space-y-2">
                    <Label htmlFor="points">Current points balance</Label>
                    <Input
                      id="points"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 4,850"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      className="font-mono-tabular text-lg"
                    />
                  </div>
                )}

                {syncMethod === "SCREENSHOT" && (
                  <ScreenshotUploader
                    chainSlug={chainSlug}
                    onConfirm={(extracted) => onScreenshotConfirm(extracted)}
                  />
                )}

                {syncMethod === "API" && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                      <Zap className="h-4 w-4" />
                      <p className="text-sm font-medium">Auto-sync isn&apos;t live for this chain yet.</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      We&apos;ve scaffolded the connector — once we plug in the API, this account will
                      refresh on its own. Pick Manual or Screenshot for now.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && chainSlug && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-4 py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full gradient-amber shadow-[0_8px_32px_-8px_rgba(245,158,11,0.6)]"
                >
                  <Check className="h-7 w-7 text-[#0a0a0b]" strokeWidth={3} />
                </motion.div>
                <div>
                  <p className="font-display text-xl font-semibold">All stacked.</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {CHAINS[chainSlug].name} now contributes{" "}
                    <span className="text-[var(--accent)] font-medium">
                      {Number(points).toLocaleString()}
                    </span>{" "}
                    {CHAINS[chainSlug].pointsSymbol} to your stash.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>

        <DialogFooter>
          {step > 1 && step < 3 ? (
            <Button variant="ghost" onClick={back} className="gap-1.5" disabled={submitting}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button onClick={next} disabled={!chainSlug} className="gap-1.5">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && syncMethod === "MANUAL" && (
              <Button
                onClick={() => submit()}
                disabled={!points || Number(points) <= 0 || submitting}
                loading={submitting}
                className="gap-1.5"
              >
                {submitting ? "Saving..." : "Save account"}
                {!submitting && <Check className="h-4 w-4" />}
              </Button>
            )}
            {step === 2 && syncMethod === "API" && (
              <Button disabled className="gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pick another method
              </Button>
            )}
            {step === 2 && syncMethod === "SCREENSHOT" && (
              <span className="text-xs text-[var(--text-muted)]">
                Confirm the screenshot result above to finish.
              </span>
            )}
            {step === 3 && (
              <Button onClick={() => onOpenChange(false)} variant="primary">
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1.5 w-6 rounded-full transition-colors",
            n <= step ? "bg-[var(--accent)]" : "bg-[var(--border)]",
          )}
        />
      ))}
    </div>
  );
}

function MethodToggle({
  active,
  onClick,
  icon,
  label,
  hint,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-[var(--accent)] bg-[rgba(245,158,11,0.08)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[11px] text-[var(--text-muted)]">{hint}</span>
    </button>
  );
}
