import { prisma } from "../db/prisma"
import { Context, Telegraf } from "telegraf"

export class GroupService {
    private bot: Telegraf | null = null;

    // Method for setting the bot instance
    setBotInstance(bot: Telegraf) {
        this.bot = bot;
    }

    async addGroup(groupId: string) {
        // Check if a group with this ID already exists
        const existingGroup = await prisma.group.findUnique({
            where: { id: groupId }
        })

        // If the group already exists, do nothing
        if (existingGroup) {
            return existingGroup
        }

        // If the group doesn't exist, create a new record
        return prisma.group.create({
            data: { id: groupId }
        })
    }

    async removeGroup(groupId: string) {
        try {
            // Delete the group from the database
            return await prisma.group.delete({
                where: { id: groupId }
            })
        } catch (error) {
            // If the group doesn't exist, just ignore the error
            console.log(`Group ${groupId} not found in database`)
            return null
        }
    }

    async listGroups() {
        return prisma.group.findMany({
            orderBy: { addedAt: 'desc' }
        })
    }

    /**
     * Sends a message to all active groups
     * @param message Message text
     * @param options Additional options for sending the message
     * @returns Object with sending results: successful and failed deliveries
     */
    async broadcastMessage(message: string, options: any = {}) {
        if (!this.bot) {
            throw new Error("Bot instance not set. Call setBotInstance first.");
        }

        const groups = await this.listGroups();
        const results = {
            successful: 0,
            failed: 0,
            errors: [] as { groupId: string, error: string }[]
        };

        // Send the message to each group
        for (const group of groups) {
            try {
                await this.bot.telegram.sendMessage(group.id, message, options);
                results.successful++;
            } catch (error) {
                results.failed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                results.errors.push({ groupId: group.id, error: errorMessage });

                // If the group is not found or the bot was removed from the group, delete it from the database
                if (
                    errorMessage.includes("chat not found") ||
                    errorMessage.includes("bot was kicked") ||
                    errorMessage.includes("bot is not a member")
                ) {
                    await this.removeGroup(group.id);
                    console.log(`Group ${group.id} removed from database because bot has no access`);
                }
            }
        }

        return results;
    }
}