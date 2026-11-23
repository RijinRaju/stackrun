import { AUTHOR_HANDLE, AUTHOR_URL, REPO_URL } from "@/lib/site";

const link = "font-medium text-zinc-300 underline-offset-4 hover:text-violet-300 hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80">
      <p className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-zinc-500">
        Made by{" "}
        <a href={AUTHOR_URL} target="_blank" rel="noopener" className={link}>
          @{AUTHOR_HANDLE}
        </a>
        <span aria-hidden className="mx-2">
          ·
        </span>
        <a href={REPO_URL} target="_blank" rel="noopener" className={link}>
          GitHub repo
        </a>
      </p>
    </footer>
  );
}
