import { Router, type Request, type Response } from "express";
import { authentication, type AuthRequest } from "../middleware/authentication.js";
import { prisma } from "../lib/prisma.js";
import { learningItemsController } from "../controllers/learning-items.js";

const learningPathsRouter: Router = Router();

learningPathsRouter.use(authentication);

// Get learning paths with recommendations
learningPathsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId as string;
    
    // Get all learning items
    const items = await prisma.learningItem.findMany({
      orderBy: { order: "asc" },
      include: {
        progress: {
          where: { userId },
          select: {
            progressStatus: true,
            lastVisited: true,
          },
        },
      },
    });

    // Get completed item IDs for the user
    const completedItems = items.filter(
      (item) => item.progress?.[0]?.progressStatus === "COMPLETED"
    );
    const completedIds = new Set(completedItems.map((item) => item.id));

    // Build recommendations for each item
    const itemsWithRecommendations = items.map((item) => {
      const nextStructures = (item.nextStructures || [])
        .filter((id) => !completedIds.has(id))
        .filter((id) => {
          // Check prerequisites are completed
          const nextItem = items.find((i) => i.id === id);
          if (!nextItem) return false;
          const prereqs = nextItem.prerequisites || [];
          return prereqs.every((p) => completedIds.has(p));
        })
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean);

      const prerequisites = (item.prerequisites || [])
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean);

      return {
        id: item.id,
        name: item.name,
        order: item.order,
        category: item.category,
        description: item.description ?? null,
        problemIds: item.problemIds ?? [],
        prerequisites: item.prerequisites ?? [],
        nextStructures: item.nextStructures ?? [],
        prerequisitesDetails: prerequisites,
        nextStructuresDetails: nextStructures,
        progress: item.progress?.[0] ?? null,
      };
    });

    // Get user summary
    const summary = await prisma.userLearningSummary.findUnique({
      where: { userId },
      select: { completedCount: true, lastUpdated: true },
    });

    return res.json({
      status: "success",
      items: itemsWithRecommendations,
      summary: summary ?? { completedCount: 0, lastUpdated: null },
    });
  } catch (error) {
    console.error("Get learning paths error:", error);
    return res.status(500).json({ status: "error", message: "Failed to get learning paths" });
  }
});

// Get single learning path with full details
learningPathsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId as string;
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ status: "error", message: "Item id is required" });

    const item = await prisma.learningItem.findUnique({
      where: { id },
      include: {
        progress: {
          where: { userId },
          select: {
            id: true,
            learningItemId: true,
            progressStatus: true,
            lastVisited: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!item) return res.status(404).json({ status: "error", message: "Learning item not found" });

    // Get prerequisites and next structures with full details
    const allItems = await prisma.learningItem.findMany({
      select: { id: true, name: true, order: true, category: true },
    });
    const itemsMap = new Map(allItems.map((i) => [i.id, i]));

    const prerequisitesDetails = (item.prerequisites || [])
      .map((id) => itemsMap.get(id))
      .filter(Boolean);

    const nextStructuresDetails = (item.nextStructures || [])
      .map((id) => itemsMap.get(id))
      .filter(Boolean);

    return res.json({
      status: "success",
      item: {
        id: item.id,
        name: item.name,
        order: item.order,
        category: item.category,
        description: item.description ?? null,
        problemIds: item.problemIds ?? [],
        prerequisites: item.prerequisites ?? [],
        nextStructures: item.nextStructures ?? [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        progress: item.progress?.[0] ?? null,
        prerequisitesDetails,
        nextStructuresDetails,
      },
    });
  } catch (error) {
    console.error("Get learning path error:", error);
    return res.status(500).json({ status: "error", message: "Failed to get learning path" });
  }
});

// User progress: upsert progress status for a learning item
learningPathsRouter.post("/:id/progress", learningItemsController.upsertUserProgress);

export { learningPathsRouter };