import { db } from "@/lib/db";

// Split out from src/lib/auth.ts so this can be unit-tested without pulling
// in next-auth, which fails to resolve next/server in the test env.
export async function linkGoogleAccount({
  email,
  name,
  image,
}: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<string | null> {
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // Refuse to silently attach a Google identity to a row created by
    // someone else via credentials signup (no inbox-ownership proof yet).
    if (!existing.emailVerified) return null;
    const updated = await db.user.update({
      where: { id: existing.id },
      data: { name: name ?? undefined, image: image ?? undefined },
    });
    return updated.id;
  }

  // Google itself vouches for email ownership, so brand-new users are
  // verified on creation.
  const created = await db.user.create({
    data: { email, name, image, emailVerified: new Date() },
  });
  return created.id;
}
