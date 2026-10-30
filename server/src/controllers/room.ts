import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { deriveEventDurationMs } from "../lib/eventTimeLimit.js";
import { withDisplayProblemName } from "../utils/problemName.js";
import {
  emitToUser,
  emitRoomsInvalidate,
  emitRoomForceClosed,
} from "../socket/ioRegistry.js";
import { finishEventWithVerdicts } from "../services/battleFinish.js";

class Rooms {
  // GET PUBLIC LOBBY ROOMS
  async getLobbyRooms(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(
        1,
        Math.min(50, parseInt(req.query.limit as string) || 10),
      );
      const search = (req.query.search as string) || "";
      const maxUsers = req.query.maxUsers as string;
      const maxTime = req.query.maxTime as string;

      const where: any = {
        isTemplate: false,
        status: { in: ["WAITING", "IN_PROGRESS"] },
        type: "PUBLIC",
        OR: [
          { isPublic: true },
          { AND: [{ isPublic: false }, { password: { not: null } }, { password: { not: "" } }] },
        ],
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { roomCode: { contains: search, mode: "insensitive" } },
        ];
      }

      const [rooms, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          include: {
            host: { select: { username: true, avatarUrl: true, id: true } },
            problems: {
              select: {
                id: true,
                name: true,
                problem_number: true,
                difficulty_level: true,
              },
            },
            performances: { select: { id: true, userId: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.event.count({ where }),
      ]);

      // Filter out events the requesting user is blocked from
      const blockedEventIds = new Set<string>();
      if (userId) {
        const blocks = await prisma.eventBlock.findMany({
          where: { blockedUserId: userId },
          select: { eventId: true },
        });
        blocks.forEach((b) => blockedEventIds.add(b.eventId));
      }

      let displayRooms = rooms
        .filter((room) => !blockedEventIds.has(room.id))
        .map((room) => {
          const { password, ...publicRoom } = room;
          return {
            ...publicRoom,
            problems: (room.problems ?? []).map((problem) =>
              withDisplayProblemName(problem),
            ),
          };
        });

      // Apply maxUsers filter (post-filter since Prisma doesn't easily support range on related count)
      if (maxUsers && maxUsers !== "any") {
        const maxUsersNum = parseInt(maxUsers);
        displayRooms = displayRooms.filter(
          (room) => room.maxUsers <= maxUsersNum,
        );
      }

      // Apply maxTime filter
      if (maxTime && maxTime !== "any") {
        const maxTimeNum = parseInt(maxTime);
        displayRooms = displayRooms.filter((room) => {
          const minutes = room.totalTimeLimitMs
            ? Math.round(room.totalTimeLimitMs / 60000)
            : null;
          return minutes !== null && minutes <= maxTimeNum;
        });
      }

      const totalPages = Math.ceil(total / limit);
      return res.json({
        status: "success",
        rooms: displayRooms,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET MY EVENTS (BOTH PUBLIC AND PRIVATE)
  async getMyEvents(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(
        1,
        Math.min(50, parseInt(req.query.limit as string) || 10),
      );
      const search = (req.query.search as string) || "";
      const maxTime = req.query.maxTime as string;
      const access = req.query.access as string;

      const where: any = { hostId: userId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { roomCode: { contains: search, mode: "insensitive" } },
        ];
      }

      if (access === "open") {
        where.isPublic = true;
        where.password = null;
      } else if (access === "protected") {
        where.isPublic = false;
        where.password = { not: null };
      }

      const [events, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          include: {
            host: { select: { username: true, avatarUrl: true } },
            problems: { select: { difficulty_level: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.event.count({ where }),
      ]);

      let safeEvents = events.map((event) => {
        const { password, ...publicEvent } = event;
        return publicEvent;
      });

      // Apply maxTime filter
      if (maxTime && maxTime !== "any") {
        const maxTimeNum = parseInt(maxTime);
        safeEvents = safeEvents.filter((event) => {
          const minutes = event.totalTimeLimitMs
            ? Math.round(event.totalTimeLimitMs / 60000)
            : null;
          return minutes !== null && minutes <= maxTimeNum;
        });
      }

      const totalPages = Math.ceil(total / limit);
      return res.json({
        status: "success",
        events: safeEvents,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error("Fetch my events error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET PUBLIC TEMPLATES
  async getTemplates(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(
        1,
        Math.min(50, parseInt(req.query.limit as string) || 10),
      );
      const search = (req.query.search as string) || "";
      const maxTime = req.query.maxTime as string;
      const access = req.query.access as string;

      const where: any = { isTemplate: true, isPublic: true };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { roomCode: { contains: search, mode: "insensitive" } },
        ];
      }

      if (access === "open") {
        where.password = null;
      } else if (access === "protected") {
        where.password = { not: null };
      }

      const [templates, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          include: {
            host: { select: { username: true, avatarUrl: true } },
            problems: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.event.count({ where }),
      ]);

      let displayTemplates = templates.map((template) => {
        const { password, ...publicTemplate } = template;
        return {
          ...publicTemplate,
          problems: (template.problems ?? []).map((problem) =>
            withDisplayProblemName(problem),
          ),
        };
      });

      // Apply maxTime filter
      if (maxTime && maxTime !== "any") {
        const maxTimeNum = parseInt(maxTime);
        displayTemplates = displayTemplates.filter((template) => {
          const minutes = template.totalTimeLimitMs
            ? Math.round(template.totalTimeLimitMs / 60000)
            : null;
          return minutes !== null && minutes <= maxTimeNum;
        });
      }

      const totalPages = Math.ceil(total / limit);
      return res.json({
        status: "success",
        templates: displayTemplates,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // CREATE ROOM (OR TEMPLATE)
  async createRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const {
        name,
        description,
        isPublic,
        password,
        maxUsers,
        totalTimeLimitMs,
        isTemplate,
        problemIds,
        opensAt,
        closesAt,
      } = req.body;

      // Generate a random 6-character room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newRoom = await prisma.event.create({
        data: {
          name,
          description,
          isPublic,
          password,
          totalTimeLimitMs,
          maxUsers: maxUsers || 2,
          isTemplate,
          hostId: userId,
          roomCode,
          type: "PUBLIC",
          status: "WAITING",
          version: 1,
          opensAt: opensAt ? new Date(opensAt) : null,
          closesAt: closesAt ? new Date(closesAt) : null,
          // Connect selected problems to this room
          problems: {
            connect: problemIds.map((id: string) => ({ id })),
          },
        },
      });

      // Scheduled rooms: tell the host the room is queued to open.
      if (opensAt) {
        void emitToUser(userId, "room_scheduled", {
          roomId: newRoom.id,
          roomCode: newRoom.roomCode,
          opensAt: newRoom.opensAt,
          closesAt: newRoom.closesAt,
        });
      }

      // New public room → refresh every lobby in realtime.
      emitRoomsInvalidate();

      return res.json({
        status: "success",
        message: isTemplate ? "Template Saved!" : "Room Created!",
        room: newRoom,
      });
    } catch (error) {
      console.error("Create room error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // CLONE/SUBSCRIBE TO A TEMPLATE
  async cloneTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const targetTemplateId = req.body.templateId || req.body.templateEventId;

      // Fetch the template
      const template = await prisma.event.findUnique({
        where: { id: targetTemplateId },
        include: { problems: true },
      });

      if (!template || !template.isTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Register the Subscription (Locks them into this version)
      await prisma.templateSubscription.upsert({
        where: {
          userId_templateEventId: { userId, templateEventId: template.id },
        },
        create: {
          userId,
          templateEventId: template.id,
          subscribedVersion: template.version ?? 1,
        },
        update: {
          subscribedVersion: template.version ?? 1,
        },
      });

      // Clone the template as a new active room
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const clonedRoom = await prisma.event.create({
        data: {
          name: req.body.name || `${template.name} (Clone)`,
          description: template.description,
          isPublic: true,
          password: req.body.password || null,
          maxUsers: template.maxUsers || 2,
          totalTimeLimitMs: template.totalTimeLimitMs,
          hostId: userId,
          roomCode,
          type: template.type || "PUBLIC",
          status: "WAITING",
          isTemplate: false,
          version: template.version ?? 1,
          problems: {
            connect: template.problems.map((p: any) => ({ id: p.id })),
          },
        },
      });

      emitRoomsInvalidate();

      return res.json({
        status: "success",
        message: "Template Cloned and Deployed!",
        room: clonedRoom,
      });
    } catch (error) {
      console.error("Clone template error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // LOCK ROOM
  async lockRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { roomId } = req.body;

      // Verify the user is the host
      const room = await prisma.event.findUnique({ where: { id: roomId } });
      if (!room || room.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Only the host can lock the room" });
      }

      await prisma.event.update({
        where: { id: roomId },
        data: { status: "LOCKED" }, // Prevents new users from joining
      });

      return res.json({ status: "success", message: "Room locked!" });
    } catch (error) {
      console.error("Lock room error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // UNLOCK ROOM
  async unlockRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { roomId } = req.body;

      // Verify the user is the host
      const room = await prisma.event.findUnique({ where: { id: roomId } });
      if (!room || room.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Only the host can unlock the room" });
      }

      await prisma.event.update({
        where: { id: roomId },
        data: { status: "WAITING" }, // Re-opens the room
      });

      return res.json({ status: "success", message: "Room unlocked!" });
    } catch (error) {
      console.error("Unlock room error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // DELETE EVENT (ROOM OR TEMPLATE) — host OR global ADMIN
  async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const eventId = req.params.eventId as string; // Grabbing ID from URL parameter
      if (!eventId)
        return res.status(400).json({ message: "Event id required" });

      // Lobby cards sometimes pass roomCode instead of the raw event id.
      const event = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { roomCode: eventId }] },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = (caller?.role || "").toUpperCase() === "ADMIN";
      if (event.hostId !== userId && !isAdmin) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this event" });
      }

      // Kick everyone out with a reason BEFORE the row disappears, then
      // refresh lobbies so the room vanishes from listings in realtime.
      emitRoomForceClosed(event, "This room was deleted by the host.");
      await prisma.event.delete({ where: { id: event.id } });
      emitRoomsInvalidate();

      return res.json({
        status: "success",
        message: "Event deleted successfully",
      });
    } catch (error) {
      console.error("Delete event error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // TOGGLE EVENT VISIBILITY (PUBLIC/PRIVATE)
  async toggleEventVisibility(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { eventId, isPublic } = req.body;

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized to modify this event" });
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { isPublic },
      });

      return res.json({
        status: "success",
        message: `Event is now ${isPublic ? "Public" : "Private"}!`,
        event: updatedEvent,
      });
    } catch (error) {
      console.error("Toggle visibility error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET LIVE ROOM BY CODE OR ID — includes per-participant event analytics
  async getLiveRoom(req: AuthRequest, res: Response) {
    try {
      const roomId = req.params.roomId as string;
      const userId = req.userId as string;
      const userRole = (req as AuthRequest).userRole || "";
      const isAdmin = userRole.toUpperCase() === "ADMIN";
      const isSpectate = req.query.spectate === "true";
      let event;

      if (roomId.startsWith("room-")) {
        const eventId = roomId.replace("room-", "");
        event = await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            host: { select: { username: true, avatarUrl: true, id: true } },
            problems: {
              include: { test_cases: true, code_snippets: true },
            },
            commonProblem: {
              include: { test_cases: true, code_snippets: true },
            },
            performances: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    bio: true,
                  },
                },
                submissions: {
                  select: {
                    id: true,
                    problemId: true,
                    status: true,
                    passedCase: true,
                    totalCases: true,
                    runtimeMs: true,
                    memoryKb: true,
                    language: true,
                    attemptNumber: true,
                    isBestSubmission: true,
                    createdAt: true,
                  },
                  orderBy: { attemptNumber: "asc" },
                },
              },
            },
          },
        });
      } else {
        event = await prisma.event.findFirst({
          where: { roomCode: roomId, isTemplate: false },
          include: {
            host: { select: { username: true, avatarUrl: true, id: true } },
            problems: {
              include: { test_cases: true, code_snippets: true },
            },
            commonProblem: {
              include: { test_cases: true, code_snippets: true },
            },
            performances: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    bio: true,
                  },
                },
                submissions: {
                  select: {
                    id: true,
                    problemId: true,
                    status: true,
                    passedCase: true,
                    totalCases: true,
                    runtimeMs: true,
                    memoryKb: true,
                    language: true,
                    attemptNumber: true,
                    isBestSubmission: true,
                    createdAt: true,
                  },
                  orderBy: { attemptNumber: "asc" },
                },
              },
            },
          },
        });
      }

      if (!event) {
        return res
          .status(404)
          .json({
            message:
              "This room no longer exists — it may have been deleted or has already finished. Return to the lobby to find an active operation.",
          });
      }

      if (isSpectate && !isAdmin) {
        const isParticipant = event.performances?.some(
          (p: any) => p.userId === userId,
        );
        const isHost = event.hostId === userId;
        if (!event.isPublic && !isParticipant && !isHost) {
          console.log(`[getLiveRoom] 403 - Not authorized to spectate: isPublic=${event.isPublic}, isParticipant=${isParticipant}, isHost=${isHost}`);
          return res
            .status(403)
            .json({ message: "Not authorized to spectate this room" });
        }
      }
      console.log(`[getLiveRoom] Spectate check passed`);

      // Password check: non-host, non-admin users must supply the correct password
      // for password-protected rooms (unless pure spectating by invitation).
      if (!isAdmin && event.hostId !== userId) {
        if (event.password) {
          const suppliedPassword =
            (req.query.password as string) || (req as any).body?.password;
          if (!suppliedPassword || suppliedPassword !== event.password) {
            console.log(`[getLiveRoom] 401 - Incorrect/missing password`);
            return res
              .status(401)
              .json({ message: "Incorrect or missing password for this room" });
          }
        }
      }
      console.log(`[getLiveRoom] Password check passed`);

      // Block list check: if the requesting user is blocked from this event, deny access
      if (!isAdmin && !isSpectate && userId) {
        const isBlocked = await prisma.eventBlock.findFirst({
          where: { eventId: event.id, blockedUserId: userId },
          select: { reason: true },
        });
        if (isBlocked) {
          console.log(`[getLiveRoom] 403 - Blocked: userId=${userId}, eventId=${event.id}`);
          return res.status(403).json({
            message: "You are blocked from this event",
            blockReason: isBlocked.reason ?? undefined,
          });
        }
      }
      console.log(`[getLiveRoom] Block check passed for userId=${userId}, eventId=${event.id}`);

      // Non-host participant: auto-enroll them if needed
      if (userId && !isSpectate && !isAdmin && event.hostId !== userId) {
        const existingPerf = event.performances?.find(
          (p: any) => p.userId === userId || p.user?.id === userId,
        ) as any | undefined;

        if (existingPerf) {
          console.log(`[getLiveRoom] Existing perf found: userId=${userId}, status=${existingPerf.status}`);
          if (existingPerf.status === "REJECTED") {
            console.log(`[getLiveRoom] 403 - REJECTED status`);
            return res
              .status(403)
              .json({
                message: "You were previously rejected from this event",
              });
          }
          if (existingPerf.status === "FAILED") {
            return res
              .status(403)
              .json({ message: "You are not allowed to join this event" });
          }
          if (existingPerf.status === "SURRENDER") {
            if (event.status === "WAITING") {
              // If event is back in or still in WAITING, reset their status to PENDING so they wait properly
              await prisma.userPersonalPerformance.update({
                where: { id: existingPerf.id },
                data: { status: "PENDING" },
              });
              existingPerf.status = "PENDING";
            } else {
              return res
                .status(403)
                .json({
                  message:
                    "You have already surrendered from this active match",
                });
            }
          }
          // PASSED, COMPLETED, PENDING, etc. — proceed normally
        } else if (event.status === "WAITING") {
          // No existing record — create a PENDING one (if room isn't full)
          const currentCount = event.performances?.length || 0;
          if (currentCount < event.maxUsers) {
            try {
              const newPerf = await prisma.userPersonalPerformance.create({
                data: {
                  userId,
                  eventId: event.id,
                  status: "PENDING",
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      avatarUrl: true,
                      bio: true,
                    },
                  },
                  submissions: {
                    select: {
                      id: true,
                      problemId: true,
                      status: true,
                      passedCase: true,
                      totalCases: true,
                      runtimeMs: true,
                      memoryKb: true,
                      language: true,
                      attemptNumber: true,
                      isBestSubmission: true,
                      createdAt: true,
                    },
                    orderBy: { attemptNumber: "asc" },
                  },
                },
              });
              event.performances = [...(event.performances || []), newPerf];
            } catch (perfErr) {
              console.error("Performance creation error:", perfErr);
            }
          }
        }
      }

      const isHostOrAdmin = Boolean(
        isAdmin || (event && event.hostId === userId),
      );
      const shouldMaskProblems = !isHostOrAdmin && event.status === "WAITING";

      const sanitizeProblemForWaiting = (problem: any) => {
        if (!problem) return problem;
        if (!shouldMaskProblems) return withDisplayProblemName(problem);
        // Return metadata only without leaking problem details, test cases, or starter code
        return {
          id: problem.id,
          name: `Problem ${problem.difficulty_level || ""}`.trim(),
          difficulty_level: problem.difficulty_level,
          timeLimitMs: problem.timeLimitMs,
          tags: problem.tags,
          problem_definition:
            "<p class='font-mono text-xs text-faint'>Operation briefing encrypted. Problem will unlock when the host initiates the event.</p>",
          test_cases: [],
          code_snippets: [],
        };
      };

      const { password: _pw, ...eventWithoutPassword } = event;
      const displayEvent = eventWithoutPassword
        ? {
            ...eventWithoutPassword,
            problems: event.problems?.map(sanitizeProblemForWaiting),
            commonProblem: event.commonProblem
              ? sanitizeProblemForWaiting(event.commonProblem)
              : event.commonProblem,
          }
        : event;
      return res.json({ status: "success", room: displayEvent });
    } catch (error) {
      console.error("Get live room error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // POST /api/rooms/expire — mark a custom group battle FINISHED when time runs
  // out and stamp per-participant completion verdicts (COMPLETED vs TIMEOUT).
  async expireBattle(req: AuthRequest, res: Response) {
    try {
      const { roomId } = req.body as { roomId?: string };
      if (!roomId)
        return res
          .status(400)
          .json({ status: "error", message: "roomId is required" });

      const event = await prisma.event.findFirst({
        where: {
          OR: [
            { id: (roomId as string).replace("room-", "") },
            { roomCode: roomId as string },
          ],
        },
        include: { performances: { include: { submissions: true } } },
      });
      if (!event)
        return res
          .status(404)
          .json({ status: "error", message: "Event not found" });
      if (event.status === "FINISHED") {
        return res.json({
          status: "success",
          message: "Already finished",
          room: event,
        });
      }

      // Only host, global ADMIN may close the event.
      // (Optional groupMember model, if present in the schema, is also honored.)
      const userId = req.userId as string;
      const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const role = (caller?.role || "").toUpperCase();
      const isAdmin = role === "ADMIN";
      const isModerator = role === "MODERATOR";
      const prismaAny = prisma as any;
      let isGroupAdmin = false;
      if (prismaAny.groupMember) {
        try {
          const gm = await prismaAny.groupMember.findFirst({
            where: { groupId: event.id, userId, role: "ADMIN" },
          });
          isGroupAdmin = !!gm;
        } catch {
          isGroupAdmin = false;
        }
      }
      if (
        event.hostId !== userId &&
        !isAdmin &&
        !isModerator &&
        !isGroupAdmin
      ) {
        return res
          .status(403)
          .json({
            status: "error",
            message:
              "Only the host, a moderator, or an admin can close this battle",
          });
      }

      // Shared finish logic — identical verdicts for manual and
      // scheduled closes (see services/battleFinish.ts).
      const finished = await finishEventWithVerdicts(roomId as string);
      if (!finished) {
        return res
          .status(404)
          .json({ status: "error", message: "Event not found" });
      }

      // Tell participants the room closed and refresh lobbies.
      emitRoomForceClosed(finished, "The battle has ended.");
      emitRoomsInvalidate();

      return res.json({
        status: "success",
        message: "Battle marked FINISHED with completion verdicts",
        room: finished,
      });
    } catch (error) {
      console.error("Expire battle error:", error);
      return res.status(500).json({ status: "error", message: "Server error" });
    }
  }

  // GET BATTLE REMAINING TIME
  async getBattleTimeLeft(req: AuthRequest, res: Response) {
    try {
      const roomId = (req.query.roomId || req.params.roomId) as string;
      if (!roomId)
        return res.status(400).json({ message: "Room ID is required" });

      const eventId = roomId.startsWith("room-")
        ? roomId.replace("room-", "")
        : roomId;

      const event = await prisma.event.findFirst({
        where: {
          OR: [{ id: eventId }, { roomCode: roomId }],
        },
        include: {
          problems: {
            select: {
              timeLimitMs: true,
            },
          },
          commonProblem: {
            select: {
              timeLimitMs: true,
            },
          },
        },
      });

      if (!event) return res.status(404).json({ message: "Event not found" });

      if (!event.startedAt || event.status !== "IN_PROGRESS") {
        return res.status(200).json({
          status: "success",
          eventStatus: event.status,
          remainingSeconds: 0,
          elapsedMs: 0,
        });
      }

      // Global budget > sum of local problem limits > 1v1 commonProblem
      // local limit > 10-minute default (see lib/eventTimeLimit.ts).
      const totalDurationMs = deriveEventDurationMs(event);
      const elapsedMs = Date.now() - new Date(event.startedAt).getTime();
      const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      return res.status(200).json({
        status: "success",
        roomId: event.roomCode || roomId,
        eventStatus: event.status,
        startedAt: event.startedAt,
        remainingSeconds,
        totalDurationMs,
        elapsedMs,
        isExpired: remainingSeconds <= 0,
      });
    } catch (error) {
      console.error("Get battle time error:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  }

  // BLOCK A PARTICIPANT FROM AN EVENT (host only)
  async blockParticipant(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { eventId, targetUserId, reason } = req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Only the host can block participants" });
      }
      if (targetUserId === userId) {
        return res.status(400).json({ message: "You cannot block yourself" });
      }

      await prisma.eventBlock.upsert({
        where: {
          eventId_blockedUserId: { eventId, blockedUserId: targetUserId },
        },
        update: { reason: reason || "Blocked by host", blockedById: userId },
        create: {
          eventId,
          blockedUserId: targetUserId,
          blockedById: userId,
          reason: reason || "Blocked by host",
        },
      });

      await emitToUser(targetUserId, "you_are_blocked", {
        roomId: event.id,
        reason,
      });
      emitRoomsInvalidate();
      return res.json({ status: "success", message: "Participant blocked" });
    } catch (error) {
      console.error("Block participant error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // UNBLOCK A PARTICIPANT FROM AN EVENT (host only)
  async unblockParticipant(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { eventId, targetUserId } = req.body;

      // Resolve eventId (could be UUID or roomCode)
      const event =
        (await prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, hostId: true },
        })) ??
        (await prisma.event.findFirst({
          where: { roomCode: eventId, isTemplate: false },
          select: { id: true, hostId: true },
        }));

      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Only the host can unblock participants" });
      }

      const deleted = await prisma.eventBlock.deleteMany({
        where: { eventId: event.id, blockedUserId: targetUserId },
      });
      
      if (deleted.count === 0) {
        return res.status(404).json({ message: "No block record found for this user" });
      }

      // Reset the user's performance status from FAILED back to PENDING so they
      // can rejoin the event after being unblocked.
      await prisma.userPersonalPerformance.updateMany({
        where: { eventId: event.id, userId: targetUserId },
        data: { status: "PENDING" },
      });
      
      emitRoomsInvalidate();
      return res.json({ status: "success", message: "Participant unblocked" });
    } catch (error) {
      console.error("Unblock participant error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET ALL BLOCKED PARTICIPANTS FOR AN EVENT (host only)
  async getBlockedParticipants(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { eventId } = req.params;

      const event =
        (await prisma.event.findUnique({
          where: { id: eventId as string },
          select: { id: true, hostId: true },
        })) ??
        (await prisma.event.findFirst({
          // Rooms may be addressed by their public 6-char roomCode instead
          // of the internal id — fall back so host tooling works for both.
          where: { roomCode: eventId as string, isTemplate: false },
          select: { id: true, hostId: true },
        }));
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId !== userId) {
        return res
          .status(403)
          .json({ message: "Only the host can view blocked participants" });
      }

      const blocks = await prisma.eventBlock.findMany({
        where: { eventId: event.id },
        select: {
          id: true,
          eventId: true,
          blockedUserId: true,
          blockedById: true,
          reason: true,
          createdAt: true,
          blockedUser: {
            select: { id: true, username: true, avatarUrl: true },
          },
          blockedBy: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ status: "success", blocks });
    } catch (error) {
      console.error("Get blocked error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET MODERATOR EVENTS LISTING (moderator/admin only)
  async getModeratorEvents(req: AuthRequest, res: Response) {
    try {
      const userRole = (req as AuthRequest).userRole || "";
      const isAdmin = userRole.toUpperCase() === "ADMIN";
      const isModerator = userRole.toUpperCase() === "MODERATOR";

      if (!isAdmin && !isModerator) {
        return res
          .status(403)
          .json({ message: "Moderator or admin access required" });
      }

      const validatedQuery = (req as any).validatedQuery || {};
      const page = Math.max(1, validatedQuery.page || 1);
      const limit = Math.max(1, Math.min(100, validatedQuery.limit || 25));
      const sortBy = validatedQuery.sortBy || "createdAt";
      const sortOrder = validatedQuery.sortOrder || "desc";
      const statusFilter = validatedQuery.status as string | undefined;
      const typeFilter = validatedQuery.type as string | undefined;
      const isPublicFilter = validatedQuery.isPublic;
      const hostIdFilter = validatedQuery.hostId as string | undefined;
      const searchFilter = validatedQuery.search as string | undefined;

      const where: any = {};

      if (statusFilter) where.status = statusFilter;
      if (typeFilter) where.type = typeFilter;
      if (isPublicFilter !== undefined) where.isPublic = isPublicFilter;
      if (hostIdFilter) where.hostId = hostIdFilter;
      if (searchFilter) {
        where.OR = [
          { name: { contains: searchFilter, mode: "insensitive" } },
          { roomCode: { contains: searchFilter, mode: "insensitive" } },
          { description: { contains: searchFilter, mode: "insensitive" } },
        ];
      }

      const [events, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          include: {
            host: { select: { id: true, username: true, avatarUrl: true } },
            performances: {
              select: {
                id: true,
                userId: true,
                status: true,
                score: true,
                questionsSolved: true,
                timeTakenMs: true,
                createdAt: true,
                submissions: {
                  select: {
                    id: true,
                    status: true,
                    runtimeMs: true,
                    passedCase: true,
                    totalCases: true,
                    language: true,
                    createdAt: true,
                  },
                },
              },
            },
            _count: {
              select: { performances: true },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.event.count({ where }),
      ]);

      const eventList = events.map((event: any) => {
        const performances = event.performances || [];
        const passed = performances.filter((p: any) =>
          ["PASSED", "COMPLETED", "WON"].includes(p.status),
        ).length;
        const failed = performances.filter((p: any) =>
          ["FAILED", "TIMEOUT", "LOST", "SURRENDER"].includes(p.status),
        ).length;
        const pending = performances.filter((p: any) =>
          ["PENDING", "WAITING", "REJECTED"].includes(p.status),
        ).length;

        const allRuntimes = performances
          .flatMap((p: any) => p.submissions || [])
          .filter((s: any) => s.runtimeMs != null)
          .map((s: any) => s.runtimeMs);

        return {
          id: event.id,
          roomCode: event.roomCode,
          name: event.name,
          description: event.description,
          type: event.type,
          status: event.status,
          isPublic: event.isPublic,
          isTemplate: event.isTemplate,
          host: {
            id: event.host?.id,
            username: event.host?.username,
            avatarUrl: event.host?.avatarUrl,
          },
          maxUsers: event.maxUsers,
          totalTimeLimitMs: event.totalTimeLimitMs,
          openedAt: event.opensAt,
          closesAt: event.closesAt,
          startedAt: event.startedAt,
          finishedAt: event.finishedAt,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          participantCount: performances.length,
          problemCount: event.problems?.length || 0,
          summary: {
            passedCount: passed,
            failedCount: failed,
            pendingCount: pending,
            passRate:
              performances.length > 0
                ? Math.round((passed / performances.length) * 100)
                : 0,
          },
          runtimeStats:
            allRuntimes.length > 0
              ? {
                  best: Math.min(...allRuntimes),
                  avg: Math.round(
                    allRuntimes.reduce((a: number, b: number) => a + b, 0) /
                      allRuntimes.length,
                  ),
                  worst: Math.max(...allRuntimes),
                }
              : { best: 0, avg: 0, worst: 0 },
          blockedCount: event.blockedUsers?.length || 0,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return res.json({
        status: "success",
        events: eventList,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          status: statusFilter,
          type: typeFilter,
          isPublic: isPublicFilter,
          hostId: hostIdFilter,
          search: searchFilter,
        },
      });
    } catch (error) {
      console.error("Get moderator events error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET EVENT ANALYTICS (host + participants)
  async getEventAnalytics(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId as string;
      const { eventId } = req.params;

      // Rooms may be addressed by their public 6-char roomCode instead of
      // the internal id. Resolve the id first (supporting both) so the
      // analytics query below can run against a concrete event.
      const resolved =
        (await prisma.event.findUnique({
          where: { id: eventId as string },
          select: { id: true },
        })) ??
        (await prisma.event.findFirst({
          where: { roomCode: eventId as string, isTemplate: false },
          select: { id: true },
        }));
      if (!resolved)
        return res.status(404).json({ message: "Event not found" });

      const event = await prisma.event.findUnique({
        where: { id: resolved.id },
        include: {
          problems: true,
          performances: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true } },
              submissions: {
                select: {
                  id: true,
                  problemId: true,
                  status: true,
                  passedCase: true,
                  totalCases: true,
                  runtimeMs: true,
                  memoryKb: true,
                  language: true,
                  attemptNumber: true,
                  isBestSubmission: true,
                  createdAt: true,
                },
                orderBy: { attemptNumber: "asc" },
              },
            },
          },
        },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Host sees full analytics; non-host participants see their own stats only
      const isHost = event.hostId === userId;
      const isAdmin = (req as AuthRequest).userRole === "ADMIN";
      if (!isHost && !isAdmin) {
        const isParticipant = event.performances?.some(
          (p: any) => p.userId === userId,
        );
        if (!isParticipant) {
          return res
            .status(403)
            .json({ message: "Not authorized to view event analytics" });
        }
      }

      const performances = event.performances || [];
      const totalParticipants = performances.length;
      const passedCount = performances.filter((p: any) =>
        ["PASSED", "COMPLETED", "WON"].includes(p.status),
      ).length;
      const failedCount = performances.filter((p: any) =>
        ["FAILED", "TIMEOUT", "LOST", "SURRENDER"].includes(p.status),
      ).length;
      const pendingCount = performances.filter((p: any) =>
        ["PENDING", "REJECTED"].includes(p.status),
      ).length;

      const allRuntimes = performances
        .flatMap((p: any) => p.submissions || [])
        .filter((s: any) => s.runtimeMs != null)
        .map((s: any) => s.runtimeMs);

      const runtimeStats =
        allRuntimes.length > 0
          ? {
              best: Math.min(...allRuntimes),
              avg: Math.round(
                allRuntimes.reduce((a: number, b: number) => a + b, 0) /
                  allRuntimes.length,
              ),
              worst: Math.max(...allRuntimes),
            }
          : { best: 0, avg: 0, worst: 0 };

      const perParticipant = performances.map((p: any) => ({
        userId: p.userId,
        username: p.user?.username || "Unknown",
        avatarUrl: p.user?.avatarUrl,
        status: p.status,
        score: p.score,
        questionsSolved: p.questionsSolved,
        timeTakenMs: p.timeTakenMs,
        submissionCount: (p.submissions || []).length,
        bestRuntimeMs:
          (p.submissions || [])
            .filter((s: any) => s.status === "PASSED" && s.runtimeMs != null)
            .map((s: any) => s.runtimeMs)
            .sort((a: number, b: number) => a - b)[0] || null,
      }));

      return res.json({
        status: "success",
        analytics: {
          eventId: event.id,
          roomCode: event.roomCode,
          status: event.status,
          startedAt: event.startedAt,
          finishedAt: event.finishedAt,
          totalTimeLimitMs: event.totalTimeLimitMs,
          isHost,
          summary: {
            totalParticipants,
            passedCount,
            failedCount,
            pendingCount,
            passRate:
              totalParticipants > 0
                ? Math.round((passedCount / totalParticipants) * 100)
                : 0,
          },
          runtimeStats,
          perParticipant,
        },
      });
    } catch (error) {
      console.error("Event analytics error:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  }
}

export const roomController = new Rooms();
