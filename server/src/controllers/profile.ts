import type {AuthRequest} from "../middleware/authentication";
import type {Response} from "express";
import {prisma} from "../Lib/prisma.js";

class Profile {

    // GET PROFILE DETAILS
    async getProfileDetails(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    avatarUrl: true,
                },
            });

            if (!user) {
                return res.status(404).json({ status: "error", message: "User not found" });
            }

            return res.status(200).json({ status: "success", data: user });
        }catch(err){
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }

    // POST UPDATE PROFILE
    async updateProfile(req:AuthRequest,res:Response){
        const {username,bio,avatarUrl} = req.body;
        try {
            const user = await prisma.user.update({
                where:{
                    id:req.userId as string
                },
                data:{
                    username:username,
                    // bio:bio, // Note: 'bio' does not exist in schema.prisma yet!
                    avatarUrl:avatarUrl
                }
            });

            return res.status(200).json({ status: "success user profile updated", user });

        } catch (error) {
            console.log("Auth error: ",error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
        
    }

    // DELETE PROFILE
    async deleteProfile(req:AuthRequest,res:Response){
        try {
            await prisma.user.delete({
                where:{
                    id:req.userId as string
                }
            })
            return res.status(200).json({ status: "success user profile deleted", });
        } catch (error) {
            console.log("Auth error: ",error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }

    // GET PROFILE STATISTICS
    async getProfileStatistics(req:AuthRequest,res:Response){
        try {
            const userId = req.userId as string;
            
            // Get all performance records for this user
            const performances = await prisma.userPersonalPerformance.findMany({
                where: { userId },
                include: {
                    event: true,
                    problem: { select: { name: true, difficulty_level: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate stats
            const totalMatches = performances.length;
            const wins = performances.filter(p => p.status === 'WON' || p.status === 'PASSED').length;
            const losses = performances.filter(p => p.status === 'LOST' || p.status === 'FAILED' || p.status === 'SURRENDER').length;
            const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
            
            // Calculate total time spent (in seconds/minutes) based on timeTakenMs
            const totalTimeMs = performances.reduce((acc, curr) => acc + (curr.timeTakenMs || 0), 0);

            return res.status(200).json({
                status: "success",
                stats: {
                    totalMatches,
                    wins,
                    losses,
                    winRate,
                    totalTimeMs,
                },
                recentMatches: performances.slice(0, 10) // Return the last 10 matches for the history ledger
            });
        } catch (error) {
            console.error("Profile stats error: ", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }
}

export const profileController = new Profile();