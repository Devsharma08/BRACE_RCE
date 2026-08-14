import { prisma } from '../Lib/prisma.js'

interface SaveSubmisssionParams {
    performanceId: string;
    problemId: string;
    
    submittedCode: string;
    language: string;
    status: "PASSED" | "FAILED" | "TIMEOUT" | "ERROR" | "PENDING";
    
    runtimeMs?: number;
    memoryKb?: number;
    passedCase: number;
    totalCases: number;
    timeTakenMs?: number;
}

export async function saveSubmisssion(params: SaveSubmisssionParams) {
    // FETCH EXISTING SUBMISSION FOR THIS USER AND PROBLEM
    const existingSubmission = await prisma.codeSubmission.findMany({
        where: {
            UserPersonalPerformanceId: params.performanceId,
            problemId: params.problemId
        },
        orderBy: { attemptNumber: "desc" },
    })

    const attemptNumber = existingSubmission.length + 1;

    // CREATE NEW SUBMISSION RECORD
    const newSubmisssion = await prisma.codeSubmission.create({
        data: {
            UserPersonalPerformanceId: params.performanceId,
            problemId: params.problemId,
            submittedCode: params.submittedCode,
            language: params.language,
            status: params.status,
            runtimeMs: params.runtimeMs ?? null,
            memoryKb: params.memoryKb ?? null,
            passedCase: params.passedCase,
            totalCases: params.totalCases,
            
            attemptNumber: attemptNumber,
            isBestSubmission: false
        }
    });

    const allSubmission = [...existingSubmission, newSubmisssion];

    // DETERMINE BEST SUBMISSION
    // PRIORITY: PASSED > PASSRATE > LOWEST RUNTIME > LOWEST MEMORYKB
    const bestSubmission = allSubmission.reduce((best, curr) => {
        if (!best) return curr;

        // priority 1: PASSED 
        if (curr.status == "PASSED" && best.status != "PASSED") return curr;
        if (curr.status != "PASSED" && best.status == "PASSED") return best;

        // PASSRATE 
        const currPassrate = curr.passedCase / (curr.totalCases || 1);
        const bestPassrate = best.passedCase / (best.totalCases || 1);

        if (currPassrate > bestPassrate) return curr;
        if (currPassrate < bestPassrate) return best;

        // LOWEST RUNTIME (MUST BE VALID) 
        const currRuntime = curr.runtimeMs ?? Infinity;
        const bestRuntime = best.runtimeMs ?? Infinity;

        if (currRuntime < bestRuntime) return curr;
        if (currRuntime > bestRuntime) return best;

        // LOWEST MEMORYKB (MUST BE VALID)
        const currMem = curr.memoryKb ?? Infinity;
        const bestMem = best.memoryKb ?? Infinity;

        if (currMem < bestMem) return curr;
        if (currMem > bestMem) return best;

        // If everything is equal , keep the older one
        return best;
    });

    // UPDATE BEST SUBMISSION FLAGS IN DB
    await prisma.$transaction(allSubmission.map((sub) => {
        return prisma.codeSubmission.update({
            where: { id: sub.id },
            data: {
                isBestSubmission: sub.id == bestSubmission.id
            }
        });
    }));

    // UPDATE SCORE FIELD IN USERPERSONALPERFORMANCE
    const computedScore = bestSubmission.status === "PASSED"
        ? 1000
        : Math.floor((bestSubmission.passedCase / (bestSubmission.totalCases || 1)) * 500);

    await prisma.userPersonalPerformance.update({
        where: { id: params.performanceId },
        data: {
            score: computedScore,
            status: bestSubmission.status === "PASSED" ? "PASSED" : "PENDING"
        }
    });

    return newSubmisssion;
}