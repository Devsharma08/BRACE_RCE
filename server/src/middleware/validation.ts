import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

/**
 * Generic validation middleware factory.
 * Usage: app.post("/route", validate(bodySchema), handler)
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters.
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const errors = result.error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          status: "error",
          message: "Invalid query parameters",
          errors,
        });
      }
      // Don't modify req.query directly (it's a getter-only property in Express)
      // Instead, attach validated data to req.validatedQuery
      (req as any).validatedQuery = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate route params.
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({
        status: "error",
        message: "Invalid route parameters",
        errors,
      });
    }
    req.params = result.data as any;
    next();
  };
}

/**
 * Common reusable schemas
 */

// UUID validation
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// Auth schemas
export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(64, "Username must be 64 characters or fewer").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer"),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
});

export const signinSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, "Google credential token is required"),
});

// Profile schemas
export const updateProfileSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  bio: z.string().max(500, "Bio must be 500 characters or fewer").nullable().optional(),
  avatarUrl: z.string().url("Invalid avatar URL").nullable().optional(),
});

// Friends schemas
export const friendRequestSchema = z.object({
  targetUserId: uuidSchema,
});

export const acceptFriendRequestSchema = z.object({
  requestId: uuidSchema,
  senderId: uuidSchema,
});

export const blockUserSchema = z.object({
  targetUserId: uuidSchema,
});

export const removeFriendSchema = z.object({
  id: uuidSchema,
});

// Problems schemas
export const createCustomProblemSchema = z.object({
  name: z.string().min(1, "Problem name is required").max(200, "Name too long"),
  problem_definition: z.string().min(1, "Problem definition is required"),
  problem_hints: z.array(z.string()).optional(),
  difficulty_level: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  test_cases: z.array(z.object({
    input: z.string().min(1, "Test case input is required"),
    expectedOutput: z.string().min(1, "Expected output is required"),
    is_public: z.boolean().optional().default(true),
  })).min(1, "At least one test case is required"),
  code_snippets: z.array(z.object({
    language: z.string().min(1, "Language is required"),
    code: z.string().min(1, "Code is required"),
    wrapperCode: z.string().optional(),
  })).optional(),
  signature: z.object({
    funcName: z.string().min(1),
    returnType: z.string().min(1),
    args: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })),
  }).optional(),
});

export const seedSystemProblemsSchema = z.object({
  problems: z.array(z.object({
    name: z.string().min(1),
    problem_number: z.number().int().positive().optional(),
    github_oid: z.string().optional(),
    problem_definition: z.string().min(1),
    problem_hints: z.array(z.string()).optional(),
    difficulty_level: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    timeLimitMs: z.number().int().positive().optional(),
    test_cases: z.array(z.object({
      input: z.string(),
      expectedOutput: z.string(),
      is_public: z.boolean().optional(),
    })).optional(),
    code_snippets: z.array(z.object({
      language: z.string(),
      code: z.string(),
      wrapperCode: z.string().optional(),
    })).optional(),
    signature: z.object({
      funcName: z.string().min(1),
      returnType: z.string().min(1),
      args: z.array(z.object({
        name: z.string().min(1),
        type: z.string().min(1),
      })),
    }).optional(),
  })).min(1, "Problems array cannot be empty"),
});

// Code execution schemas
export const executeCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(100_000, "Code exceeds 100KB limit"),
  language: z.enum(["javascript", "python", "java", "cpp", "c"]),
  oid: z.string().optional(),
  mode: z.enum(["RUN", "SUBMIT"]).default("RUN"),
  customInput: z.string().optional(),
  performanceId: z.string().optional(),
  roomId: z.string().optional(),
});

// Room schemas
export const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(100).optional(),
  type: z.enum(["FRIENDS", "BOT", "PUBLIC", "ONE_VS_ONE", "CUSTOM", "TOURNAMENT"]).default("CUSTOM"),
  isPublic: z.boolean().optional().default(true),
  description: z.string().max(500).optional(),
  commonProblemId: uuidSchema.optional(),
  roomCode: z.string().min(4).max(20).optional(),
  password: z.string().min(4).max(50).optional(),
  maxUsers: z.number().int().min(2).max(10).default(2),
  totalTimeLimitMs: z.number().int().positive().optional(),
  problemIds: z.array(uuidSchema).optional(),
});

export const lockRoomSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
});

export const cloneTemplateSchema = z.object({
  templateEventId: uuidSchema,
  name: z.string().min(1).max(100).optional(),
});

export const toggleVisibilitySchema = z.object({
  eventId: uuidSchema,
});

export const expireBattleSchema = z.object({
  eventId: uuidSchema,
});

export const deleteEventSchema = z.object({
  eventId: uuidSchema,
});

// Feedback schema
export const feedbackSchema = z.object({
  content: z.string().min(1, "Feedback content is required").max(5000, "Feedback too long"),
});

// Notifications schemas
export const markReadSchema = z.object({
  id: uuidSchema,
});

// Roadmap schemas
export const generateTestsSchema = z.object({
  signature: z.object({
    funcName: z.string().min(1, "Function name is required"),
    returnType: z.string().min(1, "Return type is required"),
    args: z.array(z.object({
      name: z.string().min(1, "Argument name is required"),
      type: z.string().min(1, "Argument type is required"),
    })).min(1, "At least one argument is required"),
  }),
  count: z.number().int().min(1).max(20).default(5),
  seed: z.number().int().optional(),
});

export const generateWrappersSchema = z.object({
  signature: z.object({
    funcName: z.string().min(1),
    returnType: z.string().min(1),
    args: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })).min(1),
  }),
});

export const plagiarismCheckSchema = z.object({
  codeA: z.string().min(1, "Code A is required"),
  codeB: z.string().min(1, "Code B is required"),
  threshold: z.number().min(0).max(1).default(0.85),
});

export const focusReportSchema = z.object({
  events: z.array(z.object({
    type: z.enum(["blur", "tab_hidden", "focus"]),
    atMs: z.number().int().min(0),
  })),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  maxEvents: z.number().int().min(0).max(100).optional(),
  maxAwayMs: z.number().int().min(0).max(3600000).optional(),
});

export const ratingPreviewSchema = z.object({
  history: z.array(z.object({
    status: z.enum(["WON", "LOST", "SURRENDER", "TIMEOUT", "PASSED", "FAILED", "COMPLETED"]),
    timeTakenMs: z.number().int().positive().optional(),
  })).min(1, "At least one match required"),
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  userId: uuidSchema.optional(),
});

// Admin schemas
export const updateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN", "MODERATOR"]).optional(),
});

export const createQuestionSchema = z.object({
  name: z.string().min(1).max(200),
  difficulty_level: z.enum(["EASY", "MEDIUM", "HARD"]),
  problem_definition: z.string().min(1),
  hints: z.array(z.string()).optional(),
  timeLimitMs: z.number().int().positive().default(600000),
});

export const updateQuestionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  difficulty_level: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  problem_definition: z.string().min(1).optional(),
  hints: z.array(z.string()).optional(),
  timeLimitMs: z.number().int().positive().optional(),
});

export const resolveFeedbackSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED"]),
  adminNote: z.string().max(1000).optional(),
});

export const actOnReportSchema = z.object({
  status: z.enum(["DISMISSED", "APPROVED"]),
});

export const updateSettingSchema = z.object({
  value: z.any(),
});

// Learning paths schemas
export const learningItemSchema = z.object({
  name: z.string().min(1).max(200),
  order: z.number().int().min(0),
  category: z.string().optional(),
  description: z.string().optional(),
  problemIds: z.array(uuidSchema).optional(),
  prerequisites: z.array(uuidSchema).optional(),
  nextStructures: z.array(uuidSchema).optional(),
});

export const updateLearningProgressSchema = z.object({
  progressStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
});

/**
 * Type helper to infer schema type
 */
export type InferSchema<T extends z.ZodSchema> = z.infer<T>;