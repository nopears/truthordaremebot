import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export class AdminService {
  async listTruths() {
    return prisma.truth.findMany()
  }

  async listDares() {
    return prisma.dare.findMany()
  }

  async addTruth(text: string) {
    return prisma.truth.create({ data: { text } })
  }

  async addDare(text: string) {
    return prisma.dare.create({ data: { text } })
  }

  async deleteTruth(id: number) {
    return prisma.truth.delete({ where: { id } })
  }

  async deleteDare(id: number) {
    return prisma.dare.delete({ where: { id } })
  }

  async editTruth(id: number, text: string) {
    return prisma.truth.update({ where: { id }, data: { text } })
  }

  async editDare(id: number, text: string) {
    return prisma.dare.update({ where: { id }, data: { text } })
  }
}
