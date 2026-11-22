// Placeholder logo helpers: initials on a colour derived from the tool id.
// Shared by the React <ToolLogo> and the OG image. Real SVG logos replace this in M6.

export function logoHue(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function logoGradient(id: string): string {
  const h = logoHue(id);
  return `linear-gradient(135deg, hsl(${h} 60% 42%), hsl(${(h + 40) % 360} 60% 30%))`;
}

export function logoInitials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 2);
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
