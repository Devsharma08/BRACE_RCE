import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";

export type LearningItemPayload = {
  id: string;
  name: string;
  order: number;
  category: string;
  description: string | null;
  problemIds: string[];
  prerequisites: string[];
  nextStructures: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserLearningProgressPayload = {
  id: string;
  learningItemId: string;
  progressStatus: string;
  lastVisited: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningItemWithProgress = LearningItemPayload & {
  progress?: UserLearningProgressPayload | null;
};

class LearningItems {
  // LIST / SEARCH / FILTER
  async listLearningItems(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { search, category, status, page = "1", perPage = "20" } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.min(100, Math.max(1, parseInt(perPage, 10) || 20));
      const skip = (pageNum - 1) * per;

      const where: Record<string, any> = {};

      if (search && search.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: "insensitive" } },
          { description: { contains: search.trim(), mode: "insensitive" } },
          { category: { contains: search.trim(), mode: "insensitive" } },
        ];
      }

      if (category && category.trim()) {
        where.category = category.trim();
      }

      const [items, total] = await Promise.all([
        prisma.learningItem.findMany({
          where,
          orderBy: { order: "asc" },
          skip,
          take: per,
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
        }),
        prisma.learningItem.count({ where }),
      ]);

      const payload = items.map((item) => ({
        id: item.id,
        name: item.name,
        order: item.order,
        category: item.category,
        description: item.description ?? null,
        problemIds: item.problemIds ?? [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        progress: item.progress?.[0] ?? null,
      }));

      return res.json({
        status: "success",
        items: payload,
        pagination: {
          page: pageNum,
          per,
          total,
          pages: Math.max(1, Math.ceil(total / per)),
        },
      });
    } catch (error) {
      console.error("List learning items error:", error);
      return res.status(500).json({ status: "error", message: "Failed to list learning items" });
    }
  }

  // GET ONE BY ID
  async getLearningItemById(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const id = req.params.id;
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
          // Include related items for navigation
          _prerequisites: {
            where: { id: { in: item?.prerequisites || [] } },
            select: { id: true, name: true, order: true },
          },
          _nextStructures: {
            where: { id: { in: item?.nextStructures || [] } },
            select: { id: true, name: true, order: true },
          },
        },
      });

      if (!item) return res.status(404).json({ status: "error", message: "Learning item not found" });

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
          prerequisitesDetails: item._prerequisites ?? [],
          nextStructuresDetails: item._nextStructures ?? [],
        },
      });
    } catch (error) {
      console.error("Get learning item error:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch learning item" });
    }
  }

  // CREATE
  async createLearningItem(req: AuthRequest, res: Response) {
    try {
      const { name, order, category, description, problemIds, prerequisites, nextStructures } = req.body ?? {};
      if (!name || typeof name !== "string") {
        return res.status(400).json({ status: "error", message: "name is required" });
      }

      const item = await prisma.learningItem.create({
        data: {
          name: name.trim(),
          order: typeof order === "number" ? order : 0,
          category: (category && typeof category === "string" ? category.trim() : ""),
          description: description ? String(description).trim() : null,
          problemIds: Array.isArray(problemIds) ? problemIds.map(String) : [],
          prerequisites: Array.isArray(prerequisites) ? prerequisites.map(String) : [],
          nextStructures: Array.isArray(nextStructures) ? nextStructures.map(String) : [],
        },
      });

      return res.status(201).json({
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
          progress: null,
        },
      });
    } catch (error) {
      console.error("Create learning item error:", error);
      return res.status(500).json({ status: "error", message: "Failed to create learning item" });
    }
  }

  // UPDATE
  async updateLearningItem(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ status: "error", message: "Item id is required" });

      const existing = await prisma.learningItem.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ status: "error", message: "Learning item not found" });

      const { name, order, category, description, problemIds, prerequisites, nextStructures } = req.body ?? {};

      const updated = await prisma.learningItem.update({
        where: { id },
        data: {
          ...(name && typeof name === "string" ? { name: name.trim() } : {}),
          ...(typeof order === "number" ? { order } : {}),
          ...(category && typeof category === "string" ? { category: category.trim() } : {}),
          ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
          ...(Array.isArray(problemIds) ? { problemIds: problemIds.map(String) } : {}),
          ...(Array.isArray(prerequisites) ? { prerequisites: prerequisites.map(String) } : {}),
          ...(Array.isArray(nextStructures) ? { nextStructures: nextStructures.map(String) } : {}),
        },
      });

      return res.json({
        status: "success",
        item: {
          id: updated.id,
          name: updated.name,
          order: updated.order,
          category: updated.category,
          description: updated.description ?? null,
          problemIds: updated.problemIds ?? [],
          prerequisites: updated.prerequisites ?? [],
          nextStructures: updated.nextStructures ?? [],
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          progress: null,
        },
      });
    } catch (error) {
      console.error("Update learning item error:", error);
      return res.status(500).json({ status: "error", message: "Failed to update learning item" });
    }
  }

  // DELETE
  async deleteLearningItem(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ status: "error", message: "Item id is required" });

      await prisma.learningItem.delete({ where: { id } }).catch(() => {
        throw new Error("Learning item not found");
      });

      return res.json({ status: "success", message: "Learning item deleted" });
    } catch (error) {
      console.error("Delete learning item error:", error);
      const msg = error instanceof Error && error.message.includes("not found")
        ? "Learning item not found"
        : "Failed to delete learning item";
      const status = error instanceof Error && error.message.includes("not found") ? 404 : 500;
      return res.status(status).json({ status: "error", message: msg });
    }
  }

  // UPSERT USER PROGRESS
  async upsertUserProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const learningItemId = req.params.id;
      if (!learningItemId) return res.status(400).json({ status: "error", message: "Item id is required" });

      const { progressStatus } = req.body ?? {};
      if (!progressStatus || !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(progressStatus)) {
        return res.status(400).json({ status: "error", message: "Valid progressStatus is required" });
      }

      const updated = await prisma.userLearningProgress.upsert({
        where: { userId_learningItemId: { userId, learningItemId } },
        create: {
          userId,
          learningItemId,
          progressStatus,
          lastVisited: new Date(),
        },
        update: {
          progressStatus,
          lastVisited: new Date(),
        },
      });

      // Update summary completed count
      const completedCount = await prisma.userLearningProgress.count({
        where: { userId, progressStatus: "COMPLETED" },
      });

      await prisma.userLearningSummary.upsert({
        where: { userId },
        create: { userId, completedCount },
        update: { completedCount },
      });

      return res.json({
        status: "success",
        progress: {
          id: updated.id,
          learningItemId: updated.learningItemId,
          progressStatus: updated.progressStatus,
          lastVisited: updated.lastVisited?.toISOString() ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        summary: { completedCount },
      });
    } catch (error) {
      console.error("Upsert user progress error:", error);
      return res.status(500).json({ status: "error", message: "Failed to update progress" });
    }
  }
}

export const learningItemsController = new LearningItems();
