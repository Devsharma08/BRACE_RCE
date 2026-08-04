import { Socket, Server } from "socket.io";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";

// IN-MEMORY QUEUE
interface WaitingPlayer {
    userId: string ;
    socketId: string ;
    accepted:boolean ;
    difficulty:string ;
}

interface PendingMatch{
    matchId:string ;
    player1:WaitingPlayer ;
    player2:WaitingPlayer ;
    timeoutId:NodeJS.Timeout ;
    targetDifficulty:string;
}

const pendingMatches = new Map<string,PendingMatch>();

const waitingQueue: WaitingPlayer[] = [];


// Verify the jwt token
const verifyToken = (token: string) => {
    try {
        console.log("🔍 ATTEMPTING TO VERIFY TOKEN:", token);
        const secret = process.env.JWT_SECRET || "very-strong-secret-key";
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch (error) {
        console.log("❌ JWT ERROR:", error);
        return null;
    }
}


export const initSocketServer = (io: Server) => {
    // Authenticate every socket connection
    io.use((socket: any, next: any) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return next(new Error("No cookies found"));

        // Parse the token
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);

        if (!tokenMatch) return next(new Error("Token missing"));

        // URL Decode the string in case the browser encoded it
        let rawToken = decodeURIComponent(tokenMatch[1]);

        // Remove surrounding quotes if Express added them
        if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
            rawToken = rawToken.slice(1, -1);
        }

        // Remove "Bearer " prefix if it somehow got saved in the cookie
        if (rawToken.startsWith('Bearer ')) {
            rawToken = rawToken.slice(7);
        }

        // Verify cleaned cookie
        const decoded = verifyToken(rawToken);
        if (!decoded) return next(new Error("Cookie verification failed"));

        // Attach the authenticated userid to the socket session
        socket.data.userId = (decoded as any).userId;

        // Pass the connection to the next middleware
        next();
    });


    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        console.log(`🔌 User Connected: ${userId} (Socket ID: ${socket.id})`);

        // PVP matching events
        socket.on("join_matchmaking", async (difficulty = "ANY") => {
            console.log(`User ${userId} joined queue for ${difficulty}`);

            if (waitingQueue.some(p => p.userId === userId)) return;
            waitingQueue.push({ userId, socketId: socket.id, accepted: false, difficulty });

            // 1. Find a compatible match!
            let p1Index = -1, p2Index = -1;
            for (let i = 0; i < waitingQueue.length; i++) {
                for (let j = i + 1; j < waitingQueue.length; j++) {
                    const p1 = waitingQueue[i];
                    const p2 = waitingQueue[j];
                    
                    // Match if they want the same difficulty OR if either selected "ANY"
                    if (p1.difficulty === "ANY" || p2.difficulty === "ANY" || p1.difficulty === p2.difficulty) {
                        p1Index = i;
                        p2Index = j;
                        break;
                    }
                }
                if (p1Index !== -1) break;
            }

            // 2. If compatible match found
            if (p1Index !== -1 && p2Index !== -1) {
                const player2 = waitingQueue.splice(p2Index, 1)[0];
                const player1 = waitingQueue.splice(p1Index, 1)[0];
                console.log('Compatible Match found : ', player1.userId, " ", player2.userId);

                // Determine final problem difficulty
                let targetDifficulty = "EASY"; // Fallback
                if (player1.difficulty !== "ANY") targetDifficulty = player1.difficulty;
                else if (player2.difficulty !== "ANY") targetDifficulty = player2.difficulty;
                else targetDifficulty = ["EASY", "MEDIUM", "HARD"][Math.floor(Math.random() * 3)];

                const matchId = `pending-${Date.now()}`;
                
                const pendingMatch: PendingMatch = {
                    matchId,
                    player1,
                    player2,
                    targetDifficulty, // Store it here!
                    timeoutId: setTimeout(() => {
                        if(pendingMatches.has(matchId)){
                            io.to(player1.socketId).emit('match_declined', { message:'Match expired' });
                            io.to(player2.socketId).emit('match_declined', { message:'Match expired' });
                            pendingMatches.delete(matchId);
                        }
                    }, 15000)
                };

                pendingMatches.set(matchId, pendingMatch);
                io.to(player1.socketId).emit('match_found_pending', { matchId });
                io.to(player2.socketId).emit('match_found_pending', { matchId });
            }
        });


        socket.on('join_battle', async (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${userId} joined room ${roomId}`)
             try {
            const eventId = roomId.replace('room-','')
            const event  = await prisma.event.findUnique({ where:{ id :eventId}})

            if(!event) return;

            if(event && event.startedAt && event.status === 'IN_PROGRESS'){
                // Lazy Expiration Check: If more than 10 minutes (600,000 ms) have passed
                const timePassed = Date.now() - new Date(event.startedAt).getTime();
                if (timePassed >= 600 * 1000) {
                    await prisma.event.update({
                        where: { id: eventId },
                        data: {
                            status: 'FINISHED',
                            finishedAt: new Date(),
                            performances: { updateMany: { where: { eventId }, data: { status: 'TIMEOUT' } } }
                        }
                    }).catch(e => console.error(e));
                    return; // Don't emit state, it's over!
                }

                socket.emit("battle_state",{
                    startedAt:event.startedAt,
                    status:event.status
                })
            }
            
        } catch (error) {
            console.log('Error fetching event for battle state:',error);
        }
        })

        socket.on("check_active_battle",async()=>{
            try {
                const activePerformance = await prisma.userPersonalPerformance.findFirst({
                    where:{
                        userId: userId,
                        status: 'PENDING',
                        event: {
                            status: 'IN_PROGRESS'
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    include:{
                        event:{
                            include:{commonProblem:true}
                        }
                    }
                })
                if(activePerformance && activePerformance.event.status === 'IN_PROGRESS'){
                    // Lazy Expiration Check: Auto-cleanup zombie matches!
                    const startedAt = activePerformance.event.startedAt;
                    if (startedAt && (Date.now() - new Date(startedAt).getTime() >= 600 * 1000)) {
                        console.log(`Auto-expiring zombie match ${activePerformance.eventId} for user ${userId}`);
                        await prisma.event.update({
                            where: { id: activePerformance.eventId },
                            data: {
                                status: 'FINISHED',
                                finishedAt: new Date(),
                                performances: { updateMany: { where: { eventId: activePerformance.eventId }, data: { status: 'TIMEOUT' } } }
                            }
                        }).catch(e => console.error(e));
                        return; // Do NOT emit active_battle_found, let them start a new one!
                    }

                    console.log('Active battle found for user:',userId)
                    socket.emit('active_battle_found',{
                        roomId:`room-${activePerformance.eventId}`,
                        problemId:activePerformance.event.commonProblem?.github_oid || "local-battle"
                    })
                }
            } catch (error) {
                console.log('Error fetching active battle:',error);   
            }
        })
       

        socket.on('accept_match',async(matchId:string)=>{
            const match = pendingMatches.get(matchId);
            if(!match) return ;
            if(match.player1.userId === userId){
                match.player1.accepted = true;
            }

            if(match.player2.userId===userId){
                match.player2.accepted = true;
            }

            // check if both accepted
            if(match.player1.accepted && match.player2.accepted){
                clearTimeout(match.timeoutId);
                pendingMatches.delete(matchId);

               // Fetch a random problem from the DB!
                const problems = await prisma.problem.findMany({ where:{difficulty_level:match.targetDifficulty as any}, select:{id:true,github_oid:true} });
                const randomProblems = problems.length > 0 ? problems[Math.floor(Math.random() * problems.length)] : null;
                // Create DB event
                const event = await prisma.event.create({
                    data: {
                        type: 'PUBLIC',
                        status: 'IN_PROGRESS',
                        startedAt: new Date(),
                        commonProblemId: randomProblems?.id
                    }
                });
                await prisma.userPersonalPerformance.createMany({
                    data: [
                        { userId: match.player1.userId, eventId: event.id, status: 'PENDING' },
                        { userId: match.player2.userId, eventId: event.id, status: 'PENDING' }
                    ]
                });
                const roomName = `room-${event.id}`;
                const socket1 = io.sockets.sockets.get(match.player1.socketId);
                const socket2 = io.sockets.sockets.get(match.player2.socketId);
                socket1?.join(roomName);
                socket2?.join(roomName);
                io.to(roomName).emit("match_starting", { 
                    eventId: event.id, 
                    roomName, 
                    problemId: randomProblems?.github_oid || "local-battle" 
                });
            }

        })

        socket.on('leave_matchmaking',()=>{
            const index = waitingQueue.findIndex((p)=>p.userId === userId)
            if(index !== -1){
                waitingQueue.splice(index,1)
                console.log(`User ${userId} left the matchmaking queue`)
            }
        })

        socket.on("decline_match", (matchId: string) => {
            const match = pendingMatches.get(matchId);
            if (match) {
                clearTimeout(match.timeoutId);
                pendingMatches.delete(matchId);
                io.to(match.player1.socketId).emit("match_declined");
                io.to(match.player2.socketId).emit("match_declined");
            }
        });

        socket.on('surrender_battle', async (roomId: string) => {
            const eventId = roomId.replace("room-", "");
            await prisma.event.update({
                where: { id: eventId },
                data: { status: 'FINISHED', finishedAt: new Date() }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: userId },
                data: { status: 'SURRENDER' }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: { not: userId } },
                data: { status: 'PASSED' }
            }).catch(e => console.error(e));

            socket.to(roomId).emit('battle_update',{
                status:'Opponent Surrendered! \n You Win 🏆',
                progress:0,
                result:"OPPONENT_SURRENDERED"
            })
        });

        socket.on('battle_action', async (data: { roomId: string, userId: string, status: string, progress: number, result?: string }) => {
            if (data.roomId) {
                if (data.result) {
                    const eventId = data.roomId.replace("room-", "");
                    
                    let senderStatus = 'FAILED';
                    let receiverStatus = 'PASSED';
                    
                    if (data.result === 'OPPONENT_WON') {
                        // The sender passed all tests, meaning the sender won and receiver lost.
                        senderStatus = 'PASSED';
                        receiverStatus = 'FAILED';
                    } else if (data.result === 'OPPONENT_SURRENDERED') {
                        // The sender timed out or abandoned.
                        senderStatus = data.status.includes("Time's Up") ? 'TIMEOUT' : 'SURRENDER';
                        receiverStatus = 'PASSED';
                    }

                    await prisma.event.update({
                        where: { id: eventId },
                        data: { status: 'FINISHED', finishedAt: new Date() }
                    }).catch(e => console.error(e));

                    await prisma.userPersonalPerformance.updateMany({
                        where: { eventId: eventId, userId: userId },
                        data: { status: senderStatus }
                    }).catch(e => console.error(e));

                    await prisma.userPersonalPerformance.updateMany({
                        where: { eventId: eventId, userId: { not: userId } },
                        data: { status: receiverStatus }
                    }).catch(e => console.error(e));
                }

                // Broadcast the action to the other player in the room
                socket.to(data.roomId).emit('battle_update', {
                    status: data.status,
                    progress: data.progress,
                    result: data.result
                });
            }
        });

        socket.on("disconnect", () => {
            console.log(`❌ User Disconnected: ${userId}`);
        });
    });
}
