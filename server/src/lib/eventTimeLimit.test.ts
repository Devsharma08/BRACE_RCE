import { deriveEventDurationMs, DEFAULT_EVENT_DURATION_MS } from "./eventTimeLimit.js";

describe("deriveEventDurationMs", () => {
    test("uses the host-configured global budget first", () => {
        expect(deriveEventDurationMs({
            totalTimeLimitMs: 45 * 60 * 1000,
            problems: [{ timeLimitMs: 600000 }, { timeLimitMs: 600000 }],
            commonProblem: { timeLimitMs: 300000 },
        })).toBe(45 * 60 * 1000);
    });

    test("sums local problem limits for multi-problem events without a global budget", () => {
        expect(deriveEventDurationMs({
            totalTimeLimitMs: null,
            problems: [{ timeLimitMs: 300000 }, { timeLimitMs: 900000 }],
        })).toBe(1200000);
    });

    test("uses the commonProblem local limit for 1v1 FRIENDS events", () => {
        expect(deriveEventDurationMs({
            totalTimeLimitMs: null,
            problems: [],
            commonProblem: { timeLimitMs: 300000 },
        })).toBe(300000);
    });

    test("falls back to the 10-minute default when nothing is configured", () => {
        expect(deriveEventDurationMs({})).toBe(DEFAULT_EVENT_DURATION_MS);
        expect(deriveEventDurationMs({ problems: [], commonProblem: null })).toBe(DEFAULT_EVENT_DURATION_MS);
    });

    test("treats zero / negative configured limits as unset", () => {
        expect(deriveEventDurationMs({
            totalTimeLimitMs: 0,
            commonProblem: { timeLimitMs: 600000 },
        })).toBe(600000);
    });
});
