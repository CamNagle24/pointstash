"use client";

import * as React from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Clock, Loader2, AlertCircle } from "lucide-react";
import { CHAINS, CHAIN_IDS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";
import type { Deal } from "@/types/deal";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { dealTypeLabel, discountTypeLabel } from "@/lib/formatters";

const DEAL_TYPES = ["APP_EXCLUSIVE", "IN_STORE", "ONLINE", "REWARD_MEMBER"] as const;
const DISCOUNT_TYPES = [
  "FREE_ITEM",
  "BOGO",
  "PERCENTAGE_OFF",
  "DOLLAR_OFF",
  "POINTS_MULTIPLIER",
] as const;

// All number/date fields arrive from inputs as strings; coerce and treat empty
// as "unset" so optional columns stay null instead of 0.
const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);
const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int().nonnegative().optional(),
);

const formSchema = z.object({
  chainSlug: z.string().min(1, "Pick a chain"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  dealType: z.enum(DEAL_TYPES),
  discountType: z.enum(DISCOUNT_TYPES),
  originalPrice: optionalNumber,
  dealPrice: optionalNumber,
  pointsCost: optionalInt,
  imageUrl: z.string().url("Must be a URL").optional().or(z.literal("")),
  sourceUrl: z.string().url("Must be a URL").optional().or(z.literal("")),
  redeemUrl: z.string().url("Must be a URL").optional().or(z.literal("")),
  anchorText: z.string().max(200).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

const fetcher = async (url: string): Promise<{ deals: Deal[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Error ${res.status}`);
  return res.json();
};

/** Convert a datetime-local string ("2026-06-07T12:00") to ISO, or undefined. */
function toIso(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Convert an ISO timestamp to the value a datetime-local input expects. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const selectClass =
  "flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[rgba(245,158,11,0.25)]";

export default function AdminDealsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ deals: Deal[] }>(
    "/api/admin/deals",
    fetcher,
    { revalidateOnFocus: false },
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Deal | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const deals = data?.deals ?? [];

  const openCreate = () => {
    setEditing(null);
    setSubmitError(null);
    setDialogOpen(true);
  };
  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setSubmitError(null);
    setDialogOpen(true);
  };

  const onExpire = async (deal: Deal) => {
    await fetch(`/api/admin/deals/${deal.id}?expire=1`, { method: "DELETE" });
    mutate();
  };
  const onDelete = async (deal: Deal) => {
    if (!confirm(`Delete "${deal.title}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/deals/${deal.id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-24 md:p-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Admin
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Manage deals
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {isLoading ? "Loading…" : `${deals.length} deal${deals.length === 1 ? "" : "s"} total`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New deal
        </Button>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] py-20 text-center">
          <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
          <p className="text-sm text-[var(--danger)]">{error.message}</p>
          <p className="text-xs text-[var(--text-muted)]">
            You must be signed in as an admin to view this page.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <p className="font-display text-lg font-semibold">No deals yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create one, or run <code>npm run db:seed:deals</code>.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-[var(--border)]">
            {deals.map((deal) => {
              const slug = (deal.chain?.slug ?? "mcdonalds") as ChainId;
              const expired =
                deal.expiresAt != null && new Date(deal.expiresAt).getTime() < Date.now();
              return (
                <div
                  key={deal.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-tertiary)]"
                >
                  <ChainLogo slug={slug} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{deal.title}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {CHAINS[slug]?.name ?? slug} · {dealTypeLabel[deal.dealType]} ·{" "}
                      {discountTypeLabel[deal.discountType]}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <Badge variant={deal.source === "MANUAL" ? "accent" : "info"}>
                      {deal.source}
                    </Badge>
                    {!deal.isActive ? (
                      <Badge variant="muted">Inactive</Badge>
                    ) : expired ? (
                      <Badge variant="danger">Expired</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => openEdit(deal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Expire now" onClick={() => onExpire(deal)}>
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      className="text-[var(--danger)] hover:text-red-400"
                      onClick={() => onDelete(deal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DealForm
            key={editing?.id ?? "new"}
            editing={editing}
            submitError={submitError}
            onCancel={() => setDialogOpen(false)}
            onSaved={() => {
              setDialogOpen(false);
              mutate();
            }}
            onError={setSubmitError}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DealForm({
  editing,
  submitError,
  onCancel,
  onSaved,
  onError,
}: {
  editing: Deal | null;
  submitError: string | null;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? {
          chainSlug: (editing.chain?.slug ?? "") as string,
          title: editing.title,
          description: editing.description ?? "",
          dealType: editing.dealType,
          discountType: editing.discountType,
          originalPrice: editing.originalPrice ?? undefined,
          dealPrice: editing.dealPrice ?? undefined,
          pointsCost: editing.pointsCost ?? undefined,
          imageUrl: editing.imageUrl ?? "",
          sourceUrl: editing.sourceUrl ?? "",
          redeemUrl: editing.redeemUrl ?? "",
          anchorText: editing.anchorText ?? "",
          startsAt: toLocalInput(editing.startsAt),
          expiresAt: toLocalInput(editing.expiresAt),
        }
      : { dealType: "APP_EXCLUSIVE", discountType: "FREE_ITEM" },
  });

  const onSubmit = handleSubmit(async (raw) => {
    onError(null);
    const parsed = formSchema.parse(raw);
    const payload = {
      chainSlug: parsed.chainSlug,
      title: parsed.title,
      description: parsed.description || undefined,
      dealType: parsed.dealType,
      discountType: parsed.discountType,
      originalPrice: parsed.originalPrice,
      dealPrice: parsed.dealPrice,
      pointsCost: parsed.pointsCost,
      imageUrl: parsed.imageUrl || undefined,
      sourceUrl: parsed.sourceUrl || undefined,
      redeemUrl: parsed.redeemUrl || undefined,
      anchorText: parsed.anchorText || undefined,
      startsAt: toIso(parsed.startsAt),
      expiresAt: toIso(parsed.expiresAt),
    };

    // Editing keeps source MANUAL — the chain is fixed, so PATCH omits it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { chainSlug, ...patchPayload } = payload;
    const res = editing
      ? await fetch(`/api/admin/deals/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...patchPayload,
            // PATCH clears with null, not undefined.
            description: payload.description ?? null,
            imageUrl: payload.imageUrl ?? null,
            sourceUrl: payload.sourceUrl ?? null,
            redeemUrl: payload.redeemUrl ?? null,
            anchorText: payload.anchorText ?? null,
            originalPrice: payload.originalPrice ?? null,
            dealPrice: payload.dealPrice ?? null,
            pointsCost: payload.pointsCost ?? null,
            startsAt: payload.startsAt ?? null,
            expiresAt: payload.expiresAt ?? null,
          }),
        })
      : await fetch("/api/admin/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      onError(body?.error ?? `Save failed (${res.status})`);
      return;
    }
    onSaved();
  });

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Update this curated deal. Changes go live immediately."
            : "Curated deals are marked verified and shown in the live feed."}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="chainSlug">Chain</Label>
            <select
              id="chainSlug"
              className={selectClass}
              disabled={!!editing}
              {...register("chainSlug")}
            >
              <option value="">Select chain…</option>
              {CHAIN_IDS.map((id) => (
                <option key={id} value={id}>
                  {CHAINS[id].name}
                </option>
              ))}
            </select>
            {errors.chainSlug && (
              <p className="text-xs text-[var(--danger)]">{errors.chainSlug.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Free fries with $1 purchase" {...register("title")} />
            {errors.title && <p className="text-xs text-[var(--danger)]">{errors.title.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={2}
            className={selectClass + " h-auto py-2"}
            placeholder="Details, fine print, how to redeem…"
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dealType">Deal type</Label>
            <select id="dealType" className={selectClass} {...register("dealType")}>
              {DEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {dealTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discountType">Discount type</Label>
            <select id="discountType" className={selectClass} {...register("discountType")}>
              {DISCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {discountTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="originalPrice">Original $</Label>
            <Input id="originalPrice" type="number" step="0.01" {...register("originalPrice")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dealPrice">Deal $</Label>
            <Input id="dealPrice" type="number" step="0.01" {...register("dealPrice")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pointsCost">Points</Label>
            <Input id="pointsCost" type="number" step="1" {...register("pointsCost")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Starts</Label>
            <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiresAt">Expires</Label>
            <Input id="expiresAt" type="datetime-local" {...register("expiresAt")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input id="sourceUrl" placeholder="https://… (announcement / where the deal was found)" {...register("sourceUrl")} />
          {errors.sourceUrl && (
            <p className="text-xs text-[var(--danger)]">{errors.sourceUrl.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="redeemUrl">Redeem URL</Label>
            <Input id="redeemUrl" placeholder="https://… (exact redeemable page)" {...register("redeemUrl")} />
            {errors.redeemUrl && (
              <p className="text-xs text-[var(--danger)]">{errors.redeemUrl.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anchorText">Scroll-to text</Label>
            <Input id="anchorText" placeholder="On-page text (defaults to title)" {...register("anchorText")} />
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Set <strong>Redeem URL</strong> to deep-link clicks to the exact page; the extension
          scrolls to and highlights the element matching <strong>Scroll-to text</strong>.
        </p>

        {submitError && <p className="text-sm text-[var(--danger)]">{submitError}</p>}
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {editing ? "Save changes" : "Create deal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
