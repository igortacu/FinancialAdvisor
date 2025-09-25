// utils/name.ts
export type ParsedName = {
  first?: string;
  last?: string;
  firstLast?: string; // "First Last"
  lastFirst?: string; // "Last First"
};

const cap = (s?: string) =>
  s ? s.toLowerCase().replace(/^\p{L}/u, (m) => m.toUpperCase()) : undefined;

const fromFullName = (full?: string): ParsedName => {
  if (!full) return {};
  const parts = full
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) {
    const first = cap(parts[0]);
    return { first, firstLast: first, lastFirst: first };
  }
  const first = cap(parts[0]);
  const last = cap(parts[parts.length - 1]);
  return {
    first,
    last,
    firstLast: [first, last].filter(Boolean).join(" "),
    lastFirst: [last, first].filter(Boolean).join(" "),
  };
};

const fromEmail = (email?: string): ParsedName => {
  if (!email) return {};
  const local = email.split("@")[0] || "";

  // tokens = alpha-only chunks (drop digits)
  const tokens = (local.match(/[A-Za-z]+/g) || []).map((t) => t.toLowerCase());

  if (tokens.length === 0) return {};
  if (tokens.length === 1) {
    const first = cap(tokens[0]);
    return { first, firstLast: first, lastFirst: first };
  }

  // Heuristics:
  // - If there is a separator (., _, -, +): assume "first last"
  // - If no separator: assume "lastfirst" (e.g., "tacu22igor" => last=tacu, first=igor)
  const hasSep = /[._+\-]/.test(local);

  let first: string | undefined;
  let last: string | undefined;

  if (hasSep) {
    first = cap(tokens[0]);
    last = cap(tokens[tokens.length - 1]);
  } else {
    // No separators → treat as last+first (matches tacu22igor → Tacu Igor)
    last = cap(tokens[0]);
    first = cap(tokens[1]);
  }

  return {
    first,
    last,
    firstLast: [first, last].filter(Boolean).join(" "),
    lastFirst: [last, first].filter(Boolean).join(" "),
  };
};

// Prefer explicit name/surname → fall back to Google "name" → fall back to email.
export const parsePreferredName = ({
  email,
  name,
  surname,
  googleFullName,
}: {
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  googleFullName?: string | null;
}): ParsedName => {
  // 1) name + surname from DB (manual register path)
  if (name || surname) {
    const first = cap(name || undefined);
    const last = cap(surname || undefined);
    return {
      first,
      last,
      firstLast: [first, last].filter(Boolean).join(" "),
      lastFirst: [last, first].filter(Boolean).join(" "),
    };
  }
  // 2) Google full display name
  const g = fromFullName(googleFullName || undefined);
  if (g.first || g.last) return g;

  // 3) Try email patterns
  const e = fromEmail(email || undefined);
  return e;
};
