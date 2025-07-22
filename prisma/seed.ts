import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  await prisma.truth.createMany({
    data: [
      { text: "Ты когда-нибудь делал что-то против правил?" },
      { text: "Твой самый странный страх?" },
      { text: "Ты когда-нибудь врал друзьям?" },
    ],
  })

  await prisma.dare.createMany({
    data: [
      { text: "Станцуй, как будто тебя никто не видит." },
      { text: "Сделай 10 отжиманий." },
      { text: "Изобрази животное, которое первым придёт в голову." },
    ],
  })
}

main().then(() => {
  console.log("🌱 База успешно заселена")
  return prisma.$disconnect()
})
