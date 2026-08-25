import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Star, MessageCircle, HelpCircle, Sparkles } from "lucide-react";

export const CommunitySupportSection: React.FC = () => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setFeedback("");
      setSubmitted(false);
    }, 4000);
  };

  const reviews = [
    {
      name: "ALEXANDER_V",
      role: "SENIOR SYSTEMS ENGINEER",
      comment: "The sandboxed telemetry and real-time execution outputs cut my algorithm debugging time in half. Flawless IDE experience.",
      stars: 5,
    },
    {
      name: "ELENA_R",
      role: "COMPETITIVE PROGRAMMER",
      comment: "Side-by-side Monaco workspace + scratchpad is game changing. Running custom DSA test suites has never felt smoother.",
      stars: 5,
    },
    {
      name: "MARCUS_K",
      role: "FULLSTACK ARCHITECT",
      comment: "Clean, ultra-fast RCE execution. The futuristic terminal UI combined with local workspace persistence is top-tier.",
      stars: 5,
    },
  ];

  return (
    <section className="w-full min-h-[100vh] py-16 sm:py-24 flex flex-col justify-center items-center font-mono select-none border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-14 w-full">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span>COMMUNITY // FEEDBACK & SUPPORT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Developer Voice & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400">Reviews</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 font-sans leading-relaxed max-w-xl mx-auto">
            Direct telemetry from our global network of engineers, competitive coders, and algorithm enthusiasts.
          </p>
        </div>

        {/* Top Grid: Customer Reviews (3 Cards with 4px borders) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, idx) => (
            <div
              key={rev.name}
              className={`group relative overflow-hidden rounded-none border border-white/20 bg-[#06080e] p-6 sm:p-7 flex flex-col justify-between hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] transition-all duration-300 ${
                idx === 0
                  ? "border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70"
                  : idx === 1
                  ? "border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70"
                  : "border-t-4 border-r-4 border-t-cyan-500/70 border-r-cyan-500/70"
              }`}
            >
              <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div>
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {[...Array(rev.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 font-normal">
                  "{rev.comment}"
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wider group-hover:text-cyan-300 transition-colors">
                    {rev.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 tracking-widest font-mono">
                    {rev.role}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-cyan-400/60" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Split Grid: Support & Feedback Forms */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Support Info */}
          <div className="md:col-span-5 rounded-none border border-white/20 border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest mb-4">
                <HelpCircle className="w-4 h-4" />
                <span>SUPPORT // HELPDESK</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3">
                Need Telemetry Support or Guidance?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 font-normal">
                Our support network is live 24/7. Whether you're encountering execution sandbox issues or looking for setup suggestions, our team is standing by.
              </p>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-3 p-3.5 rounded-none border border-white/10 bg-cyan-950/30 text-cyan-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>24/7 Sandbox execution uptime monitoring</span>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-none border border-white/10 bg-cyan-950/30 text-cyan-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Direct repository issues & suggestions hotline</span>
              </div>
            </div>
          </div>

          {/* Interactive Form */}
          <div className="md:col-span-7 rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-7 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3">
                <MessageSquare className="w-4 h-4" />
                <span>TRANSMIT // FEEDBACK & SUGGESTIONS</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                Submit Your Suggestion
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-sans mb-6 font-normal">
                Have ideas for new RCE telemetry tools, data structures, or UI tweaks? Send your feedback directly to the engineering log.
              </p>

              {submitted ? (
                <div className="p-6 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    TELEMETRY_LOGGED: Thank you for your feedback & suggestion!
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter your suggestion, feature request, or review here..."
                    className="w-full p-4 rounded-none border border-white/20 bg-black/60 text-slate-200 text-xs sm:text-sm font-sans focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/50 transition-all resize-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="self-end px-6 py-3 rounded-none bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 hover:border-cyan-300 text-cyan-300 hover:text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>[ TRANSMIT FEEDBACK ]</span>
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
