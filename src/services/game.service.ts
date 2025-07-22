import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class GameService {
  async getRandomTruth(): Promise<string> {
    const count = await prisma.truth.count()
    const skip = Math.floor(Math.random() * count)
    const item = await prisma.truth.findFirst({ skip })
    return item?.text || "Нет вопросов 😕"
  }

  async getRandomDare(): Promise<string> {
    const count = await prisma.dare.count()
    const skip = Math.floor(Math.random() * count)
    const item = await prisma.dare.findFirst({ skip })
    return item?.text || "Нет заданий 😕"
  }
}
