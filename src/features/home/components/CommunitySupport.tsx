import type { FormEvent } from "react";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../../../config/api";

/**
 * CommunitySupport — home "developer voice & reviews" + feedback desk.
 *
 * Sticky signal-desk aside + reviews ledger + helpdesk/feedback pair.
 * The feedback form POSTs to the authenticated /api/feedback endpoint
 * (kept from the previous section — do not downgrade to local state).
 */

const reviews = [
  ["ALEXANDER_V", "SENIOR SYSTEMS ENGINEER", "The sandbox telemetry and realtime execution output cut my debugging time in half."],
  ["ELENA_R", "COMPETITIVE PROGRAMMER", "The side-by-side workspace makes running custom DSA suites feel effortless."],
  ["MARCUS_K", "FULLSTACK ARCHITECT", "Fast RCE execution with a focused terminal surface. It feels built for serious practice."],
];

export function CommunitySupport() {
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = feedback.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/feedback", { content });
      setSent(true);
      setFeedback("");
      setTimeout(() => setSent(false), 4000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 401 || status === 403) {
        setError("Please sign in to submit feedback.");
      } else {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to send feedback. Please try again later.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-label="Community support and reviews" className="w-full py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16 lg:items-start lg:min-h-screen">
        {/* Sticky signal desk — pins to viewport top while right column scrolls past */}
        <aside className="bg-base lg:sticky lg:top-0 z-10">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            <MessageCircle size={14} /> Signal desk
          </div>
          <h2 className="mt-5 font-mono text-4xl font-bold tracking-[-0.04em] text-fg md:text-5xl leading-tight">
            Built by<br />
            <span className="text-accent-primary">operators.</span>
          </h2>
          <p className="mt-5 text-sm leading-7 text-faint">
            A direct channel for the people testing, shaping, and stress-testing the execution cycle.
          </p>
          <div className="mt-10 border-l border-accent-primary/40 pl-4 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            <span className="mb-2 block text-accent-success">● channel open</span>
            Feedback is routed to the engineering log.
          </div>
        </aside>

        <div className="min-w-0">
          {/* Desk header */}
          <header className="flex items-center justify-between border-b border-line pb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
            <span className="flex items-center gap-2">
              <Sparkles size={12} className="text-accent-primary" /> Community intelligence
            </span>
            <span className="text-accent-success">Channel / operational</span>
          </header>

          {/* Stats row */}
          <div className="grid grid-cols-3 border-b border-line py-5 font-mono">
            <div>
              <div className="text-xl font-bold text-fg">OPEN</div>
              <div className="mt-1 text-[8px] uppercase tracking-widest text-faint">support channel</div>
            </div>
            <div>
              <div className="text-xl font-bold text-fg">DIRECT</div>
              <div className="mt-1 text-[8px] uppercase tracking-widest text-faint">feedback route</div>
            </div>
            <div>
              <div className="text-xl font-bold text-fg">LIVE</div>
              <div className="mt-1 text-[8px] uppercase tracking-widest text-faint">engineering log</div>
            </div>
          </div>

          {/* Reviews ledger */}
          <div aria-label="Community reviews" className="divide-y divide-line">
            {reviews.map(([name, role, comment], index) => (
              <article
                key={name}
                className="group relative grid gap-5 py-8 transition before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-accent-primary before:opacity-0 before:transition group-hover:before:opacity-100 md:grid-cols-[100px_1fr_150px] md:gap-8"
              >
                <div className="font-mono text-xs text-accent-primary">
                  0{index + 1}
                  <span className="text-faint"> / signal</span>
                </div>
                <blockquote className="max-w-xl text-lg leading-8 tracking-tight text-subtle transition group-hover:text-fg">
                  “{comment}”
                </blockquote>
                <footer className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint md:text-right">
                  <div className="font-bold text-fg">{name}</div>
                  <div className="mt-2 leading-4">{role}</div>
                </footer>
              </article>
            ))}
          </div>

          {/* Helpdesk + feedback form */}
          <div className="mt-8 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <div className="group relative overflow-hidden rounded-card border border-line bg-surface p-6 transition hover:border-accent-success/30 sm:p-8">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-accent-success/10 transition group-hover:scale-110" />
              <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-success">
                <HelpCircle size={15} /> Helpdesk
              </div>
              <h3 className="mt-12 max-w-xs font-mono text-2xl font-bold tracking-tight text-fg">
                Need guidance inside the sandbox?
              </h3>
              <p className="mt-4 text-sm leading-6 text-faint">
                Report execution issues or help shape the next protocol.
              </p>
              <div className="mt-8 space-y-3">
                {["24/7 uptime monitoring", "Direct issues channel"].map((item) => (
                  <div key={item} className="flex items-center gap-3 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-subtle">
                    <CheckCircle2 size={14} className="shrink-0 text-accent-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-card border border-accent-primary/20 bg-accent-primary/[0.035] p-6 transition hover:border-accent-primary/40 sm:p-8">
              <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-primary/15" />
              <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                <MessageSquare size={15} /> Transmit feedback
              </div>
              <h3 className="mt-5 font-mono text-2xl font-bold text-fg">Add to the log.</h3>
              {sent ? (
                <div className="mt-8 flex items-center gap-3 border border-accent-success/30 bg-accent-success/[0.06] p-5 font-mono text-xs text-accent-success">
                  <CheckCircle2 size={18} /> TELEMETRY_LOGGED: feedback received.
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6">
                  <label htmlFor="home-feedback" className="sr-only">
                    Feedback and suggestions
                  </label>
                  <textarea
                    id="home-feedback"
                    rows={4}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Feature request, bug report, field note..."
                    className="w-full resize-none rounded-none border border-line bg-base p-4 font-mono text-sm text-subtle outline-none placeholder:text-faint focus:border-accent-primary/60 transition-colors"
                  />
                  {error && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-accent-danger" role="alert">
                      <AlertCircle size={14} />
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!feedback.trim() || submitting}
                    className="mt-4 flex items-center gap-2 rounded-none border border-accent-primary/50 bg-accent-primary/[0.08] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/15 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={14} /> {submitting ? "Transmitting…" : "Send signal"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommunitySupport;
