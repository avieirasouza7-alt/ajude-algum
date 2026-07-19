import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Users, X } from "lucide-react";
import type { GardenChatMessage, GardenOnlinePlayer } from "@/lib/garden-realtime";
import { friendlyGardenError } from "@/lib/garden-realtime";
import { cn } from "@/lib/utils";

type Props = {
  online: GardenOnlinePlayer[];
  chat: GardenChatMessage[];
  currentUserId: string | null;
  connected: boolean;
  onSend: (body: string) => Promise<void>;
};

type ChatToast = { id: string; fullName: string; body: string };

const CHAT_TOAST_MS = 8000;
const CHAT_TOAST_MAX = 3;

export function GardenSocialPanels({ online, chat, currentUserId, connected, onSend }: Props) {
  const [open, setOpen] = useState<"chat" | "online" | null>("chat");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /* Mensagens novas viram um aviso destacado no canto superior direito do jogo. */
  const [chatToasts, setChatToasts] = useState<ChatToast[]>([]);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const toastTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (open !== "chat") return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat, open]);

  useEffect(() => {
    /* Na primeira carga só registra o histórico — não mostra aviso de mensagem antiga. */
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(chat.map((message) => message.id));
      return;
    }
    const seen = seenIdsRef.current;
    const fresh = chat.filter((message) => !seen.has(message.id));
    if (fresh.length === 0) return;

    for (const message of fresh) seen.add(message.id);
    setChatToasts((current) =>
      [
        ...current,
        ...fresh.map((message) => ({
          id: message.id,
          fullName: message.fullName,
          body: message.body,
        })),
      ].slice(-CHAT_TOAST_MAX),
    );
    for (const message of fresh) {
      const timer = window.setTimeout(() => {
        setChatToasts((current) => current.filter((toast) => toast.id !== message.id));
        toastTimersRef.current.delete(message.id);
      }, CHAT_TOAST_MS);
      toastTimersRef.current.set(message.id, timer);
    }
  }, [chat]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body);
      setDraft("");
    } catch (err) {
      setError(friendlyGardenError(err instanceof Error ? err.message : "Não foi possível enviar"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Mensagens novas do chat — destaque no canto superior direito do jogo */}
      {chatToasts.length > 0 && (
        <div className="pointer-events-none absolute right-2 top-14 z-40 flex w-[min(100vw-1rem,21rem)] flex-col items-end gap-1.5 sm:right-3 sm:top-16">
          {chatToasts.map((toast) => (
            <div
              key={toast.id}
              style={{ animation: "toast-in 0.35s ease-out" }}
              className="pointer-events-auto w-full rounded-2xl border border-emerald-300/40 bg-black/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl"
            >
              <p className="flex items-center gap-1.5 truncate text-[11px] font-bold text-emerald-300">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {toast.fullName}
              </p>
              <p className="mt-0.5 break-words text-sm font-medium leading-snug text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                {toast.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-[8.75rem] right-2 z-30 flex max-w-[min(100%-1rem,20rem)] flex-col items-end gap-2 sm:bottom-[9.5rem] sm:right-3">
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "online" ? null : "online"))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md",
              open === "online" ? "bg-emerald-500/80" : "bg-black/50 hover:bg-black/65",
            )}
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            Online {online.length}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "chat" ? null : "chat"))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md",
              open === "chat" ? "bg-primary/80" : "bg-black/50 hover:bg-black/65",
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Chat
          </button>
        </div>

        {open === "online" && (
          <div className="pointer-events-auto w-[min(100vw-1.5rem,18rem)] overflow-hidden rounded-2xl border border-white/15 bg-black/70 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <p className="text-xs font-semibold text-white">Jogando agora</p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fechar lista"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto p-2">
              {online.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-white/55">
                  Ninguém online neste momento.
                </p>
              ) : (
                online.map((player) => (
                  <div key={player.userId} className="rounded-xl bg-white/5 px-2.5 py-2 text-left">
                    <p className="truncate text-[11px] font-semibold text-white">
                      {player.fullName}
                      {player.userId === currentUserId ? " (você)" : ""}
                    </p>
                    <p className="truncate text-[10px] text-white/50">
                      {player.selectedSeedlingId
                        ? `Cuidando: ${player.selectedSeedlingId}`
                        : "No jardim"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {open === "chat" && (
          <div className="pointer-events-auto flex h-64 w-[min(100vw-1.5rem,20rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/75 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-white">Chat do Jardim</p>
                <p className="text-[10px] text-white/50">
                  {connected ? "Sincronizado" : "Reconectando…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fechar chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-2.5 py-2">
              {chat.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11px] text-white/55">
                  Seja a primeira pessoa a deixar uma mensagem no jardim.
                </p>
              ) : (
                chat.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-xl px-2.5 py-2",
                      message.userId === currentUserId ? "bg-primary/25" : "bg-white/8",
                    )}
                  >
                    <p className="truncate text-[10px] font-semibold text-emerald-200">
                      {message.fullName}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/90">
                      {message.body}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 p-2">
              {error && <p className="mb-1 px-1 text-[10px] text-red-300">{error}</p>}
              <form
                className="flex gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 280))}
                  maxLength={280}
                  placeholder="Escreva uma mensagem…"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/35 focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
