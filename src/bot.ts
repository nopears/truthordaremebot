import { Telegraf, Markup } from "telegraf"
import { GameService } from "./services/game.service"
import { AdminService } from "./services/admin.service"

const bot = new Telegraf(process.env.BOT_TOKEN!)
const gameService = new GameService()
const adminId = Number(process.env.ADMIN_ID)
const adminService = new AdminService()

bot.on("message", async (ctx) => {
  // Только личные сообщения
  if (ctx.chat.type !== "private") return

  // Если не админ
  if (ctx.from?.id !== adminId) {
    return ctx.reply(
      'Этот бот — игра "Правда или Действие". Добавьте его в группу и используйте /truth или /dare 🎲',
    )
  }

  const [cmd, ...args] = ctx.message.text.split(" ")
  const argText = args.join(" ")
  const id = Number(args[0])
  const newText = args.slice(1).join(" ")

  try {
    switch (cmd) {
      case "/list_truth":
        const truths = await adminService.listTruths()
        return ctx.reply(truths.map((t) => `${t.id}. ${t.text}`).join("\n") || "Нет вопросов")

      case "/list_dare":
        const dares = await adminService.listDares()
        return ctx.reply(dares.map((d) => `${d.id}. ${d.text}`).join("\n") || "Нет заданий")

      case "/add_truth":
        if (!argText) return ctx.reply('❌ Введите текст для "Правды"')
        await adminService.addTruth(argText)
        return ctx.reply('✅ Добавлено в список "Правда"')

      case "/add_dare":
        if (!argText) return ctx.reply('❌ Введите текст для "Действия"')
        await adminService.addDare(argText)
        return ctx.reply('✅ Добавлено в список "Действие"')

      case "/del_truth":
        if (!id) return ctx.reply("❌ Укажите ID")
        await adminService.deleteTruth(id)
        return ctx.reply('✅ Удалено из "Правды"')

      case "/del_dare":
        if (!id) return ctx.reply("❌ Укажите ID")
        await adminService.deleteDare(id)
        return ctx.reply('✅ Удалено из "Действий"')

      case "/edit_truth":
        if (!id || !newText) return ctx.reply("❌ Укажите ID и новый текст")
        await adminService.editTruth(id, newText)
        return ctx.reply('✅ Обновлено в "Правде"')

      case "/edit_dare":
        if (!id || !newText) return ctx.reply("❌ Укажите ID и новый текст")
        await adminService.editDare(id, newText)
        return ctx.reply('✅ Обновлено в "Действиях"')

      default:
        return ctx.reply(
          "⚙ Команды:\n/list_truth\n/add_truth <текст>\n/edit_truth <id> <текст>\n/del_truth <id>\n\n/list_dare\n/add_dare <текст>\n/edit_dare <id> <текст>\n/del_dare <id>",
        )
    }
  } catch (e) {
    console.error(e)
    ctx.reply("❌ Ошибка выполнения команды")
  }
})

// Приветствие при добавлении в группу
bot.on("my_chat_member", async (ctx) => {
  const update = ctx.update.my_chat_member
  const newStatus = update.new_chat_member.status
  const oldStatus = update.old_chat_member.status

  if (
    (oldStatus === "kicked" || oldStatus === "left") &&
    (newStatus === "member" || newStatus === "administrator")
  ) {
    await ctx.reply(
      `👋 Привет! Я *бот "Правда или Действие"*.

Чтобы начать игру, ответь на сообщение участника в чате с помощью:
/truth — задать вопрос
/dare — выдать задание

Удачи в игре! 🎉`,
      { parse_mode: "Markdown" },
    )
  }
})

// /truth
bot.command("truth", async (ctx) => {
  const fromUser = ctx.from
  const replyTo = ctx.message?.reply_to_message

  if (!replyTo) {
    return ctx.reply(
      "❗ Ответь этой командой на сообщение участника, которому хочешь задать вопрос.",
    )
  }

  const targetUser = replyTo.from
  if (!targetUser || targetUser.id === fromUser.id) {
    return ctx.reply("❗ Ты не можешь задать вопрос самому себе.")
  }

  const text = await gameService.getRandomTruth()
  const mention = `[${targetUser.first_name}](tg://user?id=${targetUser.id})`

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("Выполнил ✅", `done_${targetUser.id}`),
    Markup.button.callback("Пропустить ❌", `skip_${targetUser.id}`),
  ])

  await ctx.reply(`🤫 *Правда для* ${mention}:\n\n_${text}_`, {
    parse_mode: "Markdown",
    reply_markup: keyboard.reply_markup,
  })
})

// /dare
bot.command("dare", async (ctx) => {
  const fromUser = ctx.from
  const replyTo = ctx.message?.reply_to_message

  if (!replyTo) {
    return ctx.reply(
      "❗ Ответь этой командой на сообщение участника, которому хочешь выдать задание.",
    )
  }

  const targetUser = replyTo.from
  if (!targetUser || targetUser.id === fromUser.id) {
    return ctx.reply("❗ Ты не можешь выдать задание самому себе.")
  }

  const text = await gameService.getRandomDare()
  const mention = `[${targetUser.first_name}](tg://user?id=${targetUser.id})`

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("Выполнил ✅", `done_${targetUser.id}`),
    Markup.button.callback("Пропустить ❌", `skip_${targetUser.id}`),
  ])

  await ctx.reply(`🎯 *Действие для* ${mention}:\n\n_${text}_`, {
    parse_mode: "Markdown",
    reply_markup: keyboard.reply_markup,
  })
})

// Обработка кнопок
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data
  const userId = ctx.from?.id
  const message = ctx.callbackQuery.message

  if (!data || !message) return

  const [action, targetIdStr] = data.split("_")
  const targetUserId = Number(targetIdStr)

  if (userId !== targetUserId) {
    return ctx.answerCbQuery("❌ Это задание не для тебя!", { show_alert: true })
  }

  const status = action === "done" ? "✅ Выполнено" : action === "skip" ? "❌ Пропущено" : null

  if (!status) return ctx.answerCbQuery()

  const followup =
    "\n\n👉 Теперь выбери следующего игрока — ответь на его сообщение командой /truth или /dare."
  const newText = `${message.text}\n\n*Статус:* ${status}${followup}`

  try {
    await ctx.editMessageText(newText, {
      parse_mode: "Markdown",
      reply_markup: undefined,
    })
    await ctx.answerCbQuery("Спасибо за ответ!")
  } catch (e) {
    console.error("Ошибка при редактировании:", e)
  }
})

bot.launch()
console.log("🤖 Бот запущен...")
