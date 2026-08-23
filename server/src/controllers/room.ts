import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";

class Rooms {
    // GET PUBLIC LOBBY ROOMS
    async getLobbyRooms(req: AuthRequest, res: Response) {
        try {
            const rooms = await prisma.event.findMany({
                where: {
                    isPublic: true,
                    isTemplate: false,
                    status: "WAITING",
                    type: "PUBLIC"
                },
                include: {
                    host: { select: { username: true, avatarUrl: true } },
                    problems: { select: { id: true, name: true, difficulty_level: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ status: "success", rooms });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET MY EVENTS (BOTH PUBLIC AND PRIVATE)
    async getMyEvents(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const events = await prisma.event.findMany({
                where: { hostId: userId },
                include: {
                    host: { select: { username: true, avatarUrl: true } },
                    problems: { select: { difficulty_level: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ status: "success", events });
        } catch (error) {
            console.error("Fetch my events error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }


    // GET PUBLIC TEMPLATES
    async getTemplates(req: AuthRequest, res: Response) {
        try {
            const templates = await prisma.event.findMany({
                where: { isTemplate: true, isPublic: true },
                include: {
                    host: { select: { username: true, avatarUrl: true } },
                    problems: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ status: "success", templates });
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
                name, description, isPublic, password, maxUsers, totalTimeLimitMs,
                isTemplate, problemIds
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
                    // Connect selected problems to this room
                    problems: {
                        connect: problemIds.map((id: string) => ({ id }))
                    }
                }
            });

            return res.json({
                status: "success",
                message: isTemplate ? "Template Saved!" : "Room Created!",
                room: newRoom
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
            const { templateId } = req.body;

            // Fetch the template
            const template = await prisma.event.findUnique({
                where: { id: templateId },
                include: { problems: true }
            });

            if (!template || !template.isTemplate) {
                return res.status(404).json({ message: "Template not found" });
            }

            // Register the Subscription (Locks them into this version)
            // Using upsert in case they already subscribed before, we just update the version
            await prisma.templateSubscription.upsert({
                where: {
                    userId_templateEventId: { userId, templateEventId: template.id }
                },
                create: {
                    userId,
                    templateEventId: template.id,
                    subscribedVersion: template.version ?? 1
                },
                update: {
                    subscribedVersion: template.version ?? 1
                }
            });

            // Generate a new live room from this template
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const liveRoom = await prisma.event.create({
                data: {
                    name: `${template.name} (Clone)`,
                    description: template.description,
                    isPublic: template.isPublic,
                    maxUsers: template.maxUsers,
                    isTemplate: false, // This is a live room, not a template!
                    totalTimeLimitMs: template.totalTimeLimitMs,
                    hostId: userId,
                    roomCode,
                    type: "PUBLIC",
                    status: "WAITING",
                    version: template.version,
                    problems: {
                        connect: template.problems.map(p => ({ id: p.id }))
                    }
                }
            });

            return res.json({
                status: "success",
                message: "Template cloned successfully! Ready to play.",
                room: liveRoom
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
                return res.status(403).json({ message: "Only the host can lock the room" });
            }

            await prisma.event.update({
                where: { id: roomId },
                data: { status: "LOCKED" } // Prevents new users from joining
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
                return res.status(403).json({ message: "Only the host can unlock the room" });
            }

            await prisma.event.update({
                where: { id: roomId },
                data: { status: "WAITING" } // Re-opens the room
            });

            return res.json({ status: "success", message: "Room unlocked!" });
        } catch (error) {
            console.error("Unlock room error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // DELETE EVENT (ROOM OR TEMPLATE)
    async deleteEvent(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const eventId = req.params.eventId as string; // Grabbing ID from URL parameter

            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event || event.hostId !== userId) {
                return res.status(403).json({ message: "Unauthorized to delete this event" });
            }

            await prisma.event.delete({ where: { id: eventId } });

            return res.json({ status: "success", message: "Event deleted successfully" });
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
                return res.status(403).json({ message: "Unauthorized to modify this event" });
            }

            const updatedEvent = await prisma.event.update({
                where: { id: eventId },
                data: { isPublic }
            });

            return res.json({
                status: "success",
                message: `Event is now ${isPublic ? 'Public' : 'Private'}!`,
                event: updatedEvent
            });
        } catch (error) {
            console.error("Toggle visibility error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET LIVE ROOM BY CODE OR ID
    async getLiveRoom(req: AuthRequest, res: Response) {
        try {
            const roomId = req.params.roomId as string;
            let event;

            if (roomId.startsWith("room-")) {
                const eventId = roomId.replace("room-", "");
                event = await prisma.event.findUnique({
                    where: { id: eventId },
                    include: {
                        host: { select: { username: true, avatarUrl: true } },
                        problems: {
                            include: { test_cases: true, code_snippets: true }
                        },
                        commonProblem: {
                            include: { test_cases: true, code_snippets: true }
                        },
                        performances: {
                            include: { user: { select: { id: true, username: true, avatarUrl: true, bio: true } } }
                        }
                    }
                });
            } else {
                event = await prisma.event.findFirst({
                    where: { roomId, isTemplate: false },
                    include: {
                        host: { select: { username: true, avatarUrl: true, id: true } },
                        problems: {
                            include: { test_cases: true, code_snippets: true }
                        }
                    }
                });
            }

            if (!event) {
                return res.status(404).json({ message: "Room not found or has ended." });
            }

            return res.json({ status: "success", room: event });
        } catch (error) {
            console.error("Get live room error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET BATTLE REMAINING TIME
    async getBattleTimeLeft(req: AuthRequest, res: Response) {
        try {
            const roomId = (req.query.roomId || req.params.roomId) as string;
            if (!roomId) return res.status(400).json({ message: "Room ID is required" });

            const eventId = roomId.startsWith('room-') ? roomId.replace('room-', '') : roomId;

            const event = await prisma.event.findFirst({
                where: {
                    OR: [
                        { id: eventId },
                        { roomCode: roomId }
                    ]
                },
                include: {
                    problems: {
                        select: {
                            timeLimitMs: true
                        }
                    }
                }
            });

            if (!event)
                return res.status(404).json({ message: "Event not found" });

            if (!event.startedAt || event.status !== "IN_PROGRESS") {
                return res.status(200).json({
                    status: "success",
                    eventStatus: event.status,
                    remainingSeconds: 0,
                    elapsedMs: 0
                });
            }

            const totalDurationMs = event.totalTimeLimitMs || event.problems[0]?.timeLimitMs || 600000;
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
                isExpired: remainingSeconds <= 0
            });

        } catch (error) {
            console.error("Get battle time error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }

}

export const roomController = new Rooms();
