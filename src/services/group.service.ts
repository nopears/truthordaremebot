import { prisma } from "../db/prisma"

export class GroupService {
  async addGroup(groupId: string) {
    // Проверяем, существует ли уже группа с таким ID
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId }
    })

    // Если группа уже существует, ничего не делаем
    if (existingGroup) {
      return existingGroup
    }

    // Если группы нет, создаем новую запись
    return prisma.group.create({
      data: { id: groupId }
    })
  }

  async removeGroup(groupId: string) {
    try {
      // Удаляем группу из базы данных
      return await prisma.group.delete({
        where: { id: groupId }
      })
    } catch (error) {
      // Если группы нет, просто игнорируем ошибку
      console.log(`Группа ${groupId} не найдена в базе данных`)
      return null
    }
  }

  async listGroups() {
    return prisma.group.findMany({
      orderBy: { addedAt: 'desc' }
    })
  }
}