import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { prisma } from "../Lib/prisma.js";

// Assign mocks directly to Prisma delegate methods
(prisma.codeSubmission.findMany as any) = jest.fn();
(prisma.codeSubmission.create as any) = jest.fn();
(prisma.codeSubmission.update as any) = jest.fn();
(prisma.userPersonalPerformance.update as any) = jest.fn();
(prisma.$transaction as any) = jest.fn();

import { saveSubmisssion } from "./submissionEvaluator.js";

describe("SubmissionEvaluator Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should save submission and calculate score for passed solution", async () => {
    const mockExistingSubmissions: any[] = [];
    const mockNewSubmission = {
      id: "sub-1",
      UserPersonalPerformanceId: "perf-1",
      problemId: "prob-1",
      submittedCode: "function solve() {}",
      language: "javascript",
      status: "PASSED",
      passedCase: 5,
      totalCases: 5,
      runtimeMs: 45,
      memoryKb: 1200,
      attemptNumber: 1,
      isBestSubmission: false,
    };

    (prisma.codeSubmission.findMany as jest.Mock<any>).mockResolvedValue(mockExistingSubmissions);
    (prisma.codeSubmission.create as jest.Mock<any>).mockResolvedValue(mockNewSubmission);
    (prisma.$transaction as jest.Mock<any>).mockResolvedValue([]);
    (prisma.userPersonalPerformance.update as jest.Mock<any>).mockResolvedValue({});

    const result = await saveSubmisssion({
      performanceId: "perf-1",
      problemId: "prob-1",
      submittedCode: "function solve() {}",
      language: "javascript",
      status: "PASSED",
      passedCase: 5,
      totalCases: 5,
      runtimeMs: 45,
      memoryKb: 1200,
    });

    expect(prisma.codeSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptNumber: 1,
          status: "PASSED",
        }),
      })
    );

    expect(prisma.userPersonalPerformance.update).toHaveBeenCalledWith({
      where: { id: "perf-1" },
      data: {
        score: 1000,
        status: "PASSED",
      },
    });

    expect(result).toBeDefined();
  });

  test("should update best submission when new attempt has higher pass rate", async () => {
    const existingSub = {
      id: "sub-1",
      UserPersonalPerformanceId: "perf-1",
      problemId: "prob-1",
      status: "FAILED",
      passedCase: 2,
      totalCases: 5,
      runtimeMs: 100,
      memoryKb: 2000,
      attemptNumber: 1,
    };

    const newSub = {
      id: "sub-2",
      UserPersonalPerformanceId: "perf-1",
      problemId: "prob-1",
      status: "FAILED",
      passedCase: 4,
      totalCases: 5,
      runtimeMs: 80,
      memoryKb: 1800,
      attemptNumber: 2,
    };

    (prisma.codeSubmission.findMany as jest.Mock<any>).mockResolvedValue([existingSub]);
    (prisma.codeSubmission.create as jest.Mock<any>).mockResolvedValue(newSub);
    (prisma.$transaction as jest.Mock<any>).mockResolvedValue([]);
    (prisma.userPersonalPerformance.update as jest.Mock<any>).mockResolvedValue({});

    await saveSubmisssion({
      performanceId: "perf-1",
      problemId: "prob-1",
      submittedCode: "code",
      language: "python",
      status: "FAILED",
      passedCase: 4,
      totalCases: 5,
    });

    expect(prisma.userPersonalPerformance.update).toHaveBeenCalledWith({
      where: { id: "perf-1" },
      data: {
        score: 400,
        status: "PENDING",
      },
    });
  });
});
