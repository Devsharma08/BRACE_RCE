import { useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { ShieldAlert, X } from "lucide-react";
import { TURNSTILE_ENABLED, TURNSTILE_SITE_KEY } from "../../../config/turnstile";

type ExecutionCaptchaModalProps = {
  open: boolean;
  /** Bumped by the parent to force a fresh, unused challenge. */
  nonce: number;
  /** Called with a fresh single-use token. */
  onVerified: (token: string) => void;
  /** Called on cancel, expiry, error, or Escape — resolves as "no token". */
  onCancel: () => void;
  /** Optional human-readable reason, e.g. the rate-limit message. */
  reason?: string;
};

/**
 * Bot check that gates an execution.
 *
 * Rendered on demand rather than mounted permanently: a Turnstile widget that
 * sits in the terminal chrome all day goes stale (tokens expire after ~5 min)
 * and burns an extra Cloudflare request on every mount for a visitor who never
 * presses Run. Instead the parent opens this modal right before an execution
 * that needs a token, and the widget is destroyed the moment it hands one back.
 *
 * Tokens are single-use, so there is deliberately no "remember me" path here:
 * `nonce` remounts the widget for every gated execution.
 */
const ExecutionCaptchaModal = ({
  open,
  nonce,
  onVerified,
  onCancel,
  reason,
}: ExecutionCaptchaModalProps) => {
  // Escape closes the dialog. Registered only while open so a closed modal
  // never swallows the keypress the user meant for the editor.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="execution-captcha-title"
        className="w-full max-w-sm border border-accent-primary/30 bg-raised p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-accent-primary">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <h2
              id="execution-captcha-title"
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
            >
              Verify you are human
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel verification"
            className="text-subtle transition-colors hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 font-mono text-[10px] leading-relaxed text-subtle">
          Running code costs shared sandbox time. Guests confirm each run with a
          quick bot check; signing in removes it.
        </p>

        {reason && (
          <p className="mt-2 border border-accent-warning/30 bg-accent-warning/5 p-2 font-mono text-[10px] text-accent-warning">
            {reason}
          </p>
        )}

        <div className="mt-4 flex justify-center">
          {TURNSTILE_ENABLED ? (
            <Turnstile
              key={nonce}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => onVerified(token)}
              onExpire={onCancel}
              onError={onCancel}
              options={{ theme: "dark" }}
            />
          ) : (
            <p className="p-2 font-mono text-[10px] text-accent-danger">
              Bot check is not configured on this deployment. Set
              VITE_TURNSTILE_SITE_KEY to enable guest execution.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionCaptchaModal;
