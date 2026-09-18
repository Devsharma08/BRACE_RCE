import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, MessageCircle, HelpCircle, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../../../config/api";

export const CommunitySupportSection: React.FC = () => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = feedback.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/feedback", { content });
      setSubmitted(true);
      setFeedback("");
      setTimeout(() => {
        setSubmitted(false);
      }, 4000);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError("Please sign in to submit feedback.");
      } else {
        setError(err?.response?.data?.message || "Failed to send feedback. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reviews = [
    {
      name: "ALEXANDER_V",
      role: "SENIOR SYSTEMS ENGINEER",
      comment: "The sandboxed telemetry and real-time execution outputs cut my algorithm debugging time in half. Flawless IDE experience.",
    },
    {
      name: "ELENA_R",
      role: "COMPETITIVE PROGRAMMER",
      comment: "Side-by-side Monaco workspace + scratchpad is game changing. Running custom DSA test suites has never felt smoother.",
    },
    {
      name: "MARCUS_K",
      role: "FULLSTACK ARCHITECT",
      comment: "Clean, ultra-fast RCE execution. The futuristic terminal UI combined with local workspace persistence is top-tier.",
    },
  ];

  return (
    <section className="w-full min-h-[100vh] py-16 sm:py-24 flex flex-col justify-center items-center font-mono select-none border-b border-subtle-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-10 w-full">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-accent-primary/40 bg-accent-primary/10 text-accent-primary text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
            <MessageCircle className="w-4 h-4 text-accent-primary" />
            <span>COMMUNITY // FEEDBACK & SUPPORT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-fg tracking-tight leading-tight mb-4">
            Developer Voice & <span className="text-accent-primary">Reviews</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-subtle font-sans leading-relaxed max-w-xl mx-auto">
            Direct telemetry from our global network of engineers, competitive coders, and algorithm enthusiasts.
          </p>
        </div>

        {/* Top Grid: Community Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.name}
              className="group relative overflow-hidden rounded-none border border-subtle-line border-t-2 border-t-accent-primary/40 bg-raised p-6 sm:p-7 flex flex-col justify-between hover:border-accent-primary hover:shadow-[0_0_30px_rgba(0,212,255,0.18)] transition-all duration-300"
            >
              <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

              <div>
                <p className="text-xs sm:text-sm text-subtle font-sans leading-relaxed mb-6 font-normal">
                  "{rev.comment}"
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-subtle-line flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-fg tracking-wider group-hover:text-accent-primary transition-colors">
                    {rev.name}
                  </h4>
                  <span className="text-[10px] text-faint tracking-widest font-mono">
                    {rev.role}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-accent-primary/60" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Split Grid: Support & Feedback Forms */}
        <div className="border-t border-subtle-line pt-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Support Info */}
          <div className="md:col-span-5 rounded-none border border-subtle-line border-t-2 border-t-accent-primary/40 bg-raised p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

            <div>
              <div className="flex items-center gap-2 text-label font-mono text-[10px] uppercase tracking-[0.2em] mb-4">
                <HelpCircle className="w-4 h-4" />
                <span>SUPPORT // HELPDESK</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-fg mb-3">
                Need Telemetry Support or Guidance?
              </h3>
              <p className="text-xs sm:text-sm text-subtle font-sans leading-relaxed mb-6 font-normal">
                Our support network is live 24/7. Whether you're encountering execution sandbox issues or looking for setup suggestions, our team is standing by.
              </p>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-3 p-3.5 rounded-none border border-subtle-line bg-accent-primary/10 text-accent-primary text-xs">
                <CheckCircle2 className="w-4 h-4 text-accent-primary shrink-0" />
                <span>24/7 Sandbox execution uptime monitoring</span>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-none border border-subtle-line bg-accent-primary/10 text-accent-primary text-xs">
                <CheckCircle2 className="w-4 h-4 text-accent-primary shrink-0" />
                <span>Direct repository issues & suggestions hotline</span>
              </div>
            </div>
          </div>

          {/* Interactive Form */}
          <div className="md:col-span-7 rounded-none border border-subtle-line border-t-2 border-t-accent-primary/40 bg-raised p-7 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-label font-mono text-[10px] uppercase tracking-[0.2em] mb-3">
                <MessageSquare className="w-4 h-4" />
                <span>TRANSMIT // FEEDBACK & SUGGESTIONS</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-fg mb-2">
                Submit Your Suggestion
              </h3>
              <p className="text-xs sm:text-sm text-subtle font-sans mb-6 font-normal">
                Have ideas for new RCE telemetry tools, data structures, or UI tweaks? Send your feedback directly to the engineering log.
              </p>

              {submitted ? (
                <div className="p-6 rounded-none border border-accent-primary/40 bg-accent-primary/10 text-accent-primary flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    TELEMETRY_LOGGED: Thank you for your feedback & suggestion!
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="p-3 rounded-none border border-accent-danger/40 bg-accent-danger/10 text-accent-danger text-xs flex items-center gap-2" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter your suggestion, feature request, or review here..."
                    aria-label="Feedback and suggestions"
                    className="w-full p-4 rounded-none border border-subtle-line bg-void text-subtle text-xs sm:text-sm font-mono focus:outline-none focus:border-accent-primary transition-colors resize-none placeholder:text-faint"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !feedback.trim()}
                    className="self-end px-6 py-3 rounded-none bg-accent-primary/10 hover:bg-accent-primary/15 border border-accent-primary/50 hover:border-accent-primary text-accent-primary hover:text-fg font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,212,255,0.2)] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "[ TRANSMITTING… ]" : "[ TRANSMIT FEEDBACK ]"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CommunitySupportSection;
