"use client";
import { useRouter } from "next/navigation";
import {
  githubAvatar,
  githubName,
  signInWithGitHub,
  signOut,
  useUser,
} from "@/lib/supabase/useUser";

export function LoginButton() {
  const state = useUser();
  const router = useRouter();

  if (state.status === "disabled") return null;
  if (state.status === "loading") {
    return <span className="h-8 w-28 animate-pulse rounded-full bg-zinc-800" aria-hidden />;
  }
  if (state.status === "anon") {
    return (
      <button
        type="button"
        onClick={signInWithGitHub}
        className="rounded-full border border-zinc-700 px-3.5 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
      >
        Sign in with GitHub
      </button>
    );
  }

  const avatar = githubAvatar(state.user);
  return (
    <div className="flex items-center gap-2">
      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny external avatar
        <img src={avatar} alt="" width={28} height={28} className="size-7 rounded-full" />
      )}
      <span className="text-sm text-zinc-200">{githubName(state.user)}</span>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.refresh();
        }}
        className="text-xs text-zinc-500 hover:text-zinc-200"
      >
        Sign out
      </button>
    </div>
  );
}
