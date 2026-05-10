export const dealTypeLabel: Record<string, string> = {
  APP_EXCLUSIVE: "App Exclusive",
  IN_STORE: "In Store",
  ONLINE: "Online",
  REWARD_MEMBER: "Members Only",
};

export const dealTypeBadgeVariant: Record<
  string,
  "accent" | "info" | "muted" | "success"
> = {
  APP_EXCLUSIVE: "accent",
  IN_STORE: "muted",
  ONLINE: "info",
  REWARD_MEMBER: "success",
};

export const discountTypeLabel: Record<string, string> = {
  FREE_ITEM: "Free Item",
  BOGO: "BOGO",
  PERCENTAGE_OFF: "% Off",
  DOLLAR_OFF: "$ Off",
  POINTS_MULTIPLIER: "Bonus Points",
};

export const discountTypeBadgeVariant: Record<
  string,
  "success" | "accent" | "info" | "warning" | "danger"
> = {
  FREE_ITEM: "success",
  BOGO: "success",
  PERCENTAGE_OFF: "accent",
  DOLLAR_OFF: "accent",
  POINTS_MULTIPLIER: "info",
};
