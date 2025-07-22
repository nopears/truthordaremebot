import asyncio
import logging
import os
import random
import csv
import requests
import io
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from dotenv import load_dotenv

load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Получение токена из переменной окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# URL к файлам с данными
TRUTHS_URL = os.getenv("TRUTHS_URL")
DARES_URL = os.getenv("DARES_URL")

# Функция для получения случайного вопроса или задания из CSV файла по URL
def get_random_item(url):
    try:
        # Получаем содержимое файла по URL
        response = requests.get(url)
        response.raise_for_status()  # Проверяем успешность запроса
        
        # Создаем объект StringIO для работы с CSV
        csv_data = io.StringIO(response.text)
        
        # Читаем CSV
        reader = csv.DictReader(csv_data)
        items = list(reader)
        
        if not items:
            return "Нет данных 😕"
        
        # Выбираем случайный элемент
        item = random.choice(items)
        
        # Возвращаем текст (предполагаем, что в CSV есть колонка 'text')
        return item.get('text', "Ошибка формата данных")
    except requests.RequestException as e:
        logging.error(f"Ошибка при запросе к URL {url}: {e}")
        return "Произошла ошибка при получении данных с сервера 😕"
    except Exception as e:
        logging.error(f"Ошибка при обработке данных из {url}: {e}")
        return "Произошла ошибка при обработке данных 😕"


# Обработчик команды /start
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        'Привет! Я бот для игры "Правда или Действие".\n\n'
        'Добавь меня в группу и используй команды:\n'
        '/truth - задать вопрос\n'
        '/dare - выдать задание\n\n'
        'Удачной игры! 🎮'
    )


# Обработчик команды /help
@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        'Как играть в "Правда или Действие":\n\n'
        '1. Добавь меня в группу\n'
        '2. Чтобы задать вопрос участнику, ответь на его сообщение командой /truth\n'
        '3. Чтобы дать задание участнику, ответь на его сообщение командой /dare\n\n'
        'Веселой игры! 🎲'
    )


# Обработчик команды /truth
@dp.message(Command("truth"))
async def cmd_truth(message: types.Message):
    # Проверяем, что команда отвечает на сообщение
    if not message.reply_to_message:
        await message.answer(
            "❗ Ответь этой командой на сообщение участника, которому хочешь задать вопрос."
        )
        return
    
    # Получаем информацию о пользователях
    from_user = message.from_user
    target_user = message.reply_to_message.from_user
    
    # Проверяем, что пользователь не отвечает сам себе
    if target_user.id == from_user.id:
        await message.answer("❗ Ты не можешь задать вопрос самому себе.")
        return
    
    try:
        # Получаем случайный вопрос по URL
        text = get_random_item(TRUTHS_URL)
        
        # Создаем клавиатуру с кнопками
        builder = InlineKeyboardBuilder()
        builder.add(
            InlineKeyboardButton(text="Выполнил ✅", callback_data=f"done_{target_user.id}"),
            InlineKeyboardButton(text="Пропустить ❌", callback_data=f"skip_{target_user.id}")
        )
        
        # Отправляем сообщение с вопросом
        await message.answer(
            f"🤫 *Правда для* [{target_user.first_name}](tg://user?id={target_user.id}):\n\n_{text}_",
            parse_mode="Markdown",
            reply_markup=builder.as_markup()
        )
    except Exception as e:
        logging.error(f"Error in truth command: {e}")
        await message.answer("❌ Произошла ошибка при получении вопроса. Попробуйте еще раз.")


# Обработчик команды /dare
@dp.message(Command("dare"))
async def cmd_dare(message: types.Message):
    # Проверяем, что команда отвечает на сообщение
    if not message.reply_to_message:
        await message.answer(
            "❗ Ответь этой командой на сообщение участника, которому хочешь выдать задание."
        )
        return
    
    # Получаем информацию о пользователях
    from_user = message.from_user
    target_user = message.reply_to_message.from_user
    
    # Проверяем, что пользователь не отвечает сам себе
    if target_user.id == from_user.id:
        await message.answer("❗ Ты не можешь выдать задание самому себе.")
        return
    
    try:
        # Получаем случайное задание по URL
        text = get_random_item(DARES_URL)
        
        # Создаем клавиатуру с кнопками
        builder = InlineKeyboardBuilder()
        builder.add(
            InlineKeyboardButton(text="Выполнил ✅", callback_data=f"done_{target_user.id}"),
            InlineKeyboardButton(text="Пропустить ❌", callback_data=f"skip_{target_user.id}")
        )
        
        # Отправляем сообщение с заданием
        await message.answer(
            f"🎯 *Действие для* [{target_user.first_name}](tg://user?id={target_user.id}):\n\n_{text}_",
            parse_mode="Markdown",
            reply_markup=builder.as_markup()
        )
    except Exception as e:
        logging.error(f"Error in dare command: {e}")
        await message.answer("❌ Произошла ошибка при получении задания. Попробуйте еще раз.")


# Обработчик нажатий на кнопки
@dp.callback_query()
async def process_callback(callback: types.CallbackQuery):
    # Получаем данные из callback_data
    data = callback.data
    user_id = callback.from_user.id
    
    if not data:
        return
    
    # Разбираем данные
    action, target_id_str = data.split("_")
    target_user_id = int(target_id_str)
    
    # Проверяем, что кнопку нажал тот пользователь, для которого предназначено задание
    if user_id != target_user_id:
        await callback.answer("❌ Это задание не для тебя!", show_alert=True)
        return
    
    # Определяем статус выполнения
    status = "✅ Выполнено" if action == "done" else "❌ Пропущено" if action == "skip" else None
    
    if not status:
        await callback.answer()
        return
    
    # Получаем текст сообщения
    message_text = callback.message.text if callback.message and callback.message.text else ""
    
    # Формируем новый текст сообщения
    followup = "\n\n👉 Теперь выбери следующего игрока — ответь на его сообщение командой /truth или /dare."
    new_text = f"{message_text}\n\n*Статус:* {status}{followup}"
    
    try:
        # Редактируем сообщение
        await callback.message.edit_text(
            new_text,
            parse_mode="Markdown",
            reply_markup=None
        )
        await callback.answer("Спасибо за ответ!")
    except Exception as e:
        logging.error(f"Error editing message: {e}")


# Обработчик добавления бота в группу
@dp.my_chat_member()
async def on_chat_member_update(update: types.ChatMemberUpdated):
    # Получаем информацию об обновлении
    old_status = update.old_chat_member.status
    new_status = update.new_chat_member.status
    
    # Если бота добавили в группу
    if (old_status in ["kicked", "left"] and new_status in ["member", "administrator"]):
        await bot.send_message(
            update.chat.id,
            '👋 Привет! Я *бот "Правда или Действие"*.\n\n'
            'Чтобы начать игру, ответь на сообщение участника в чате с помощью:\n'
            '/truth — задать вопрос\n'
            '/dare — выдать задание\n\n'
            'Удачи в игре! 🎉',
            parse_mode="Markdown"
        )


# Функция для проверки доступности URL
async def check_url(url, description):
    try:
        response = requests.head(url, timeout=5)
        if response.status_code == 200:
            logging.info(f"{description} URL доступен: {url}")
            return True
        else:
            logging.warning(f"{description} URL недоступен (код {response.status_code}): {url}")
            return False
    except Exception as e:
        logging.error(f"Ошибка при проверке {description} URL: {e}")
        return False

# Функция запуска бота
async def main():
    logging.info("Starting bot...")
    
    # Проверяем доступность URL с данными
    truths_available = await check_url(TRUTHS_URL, "Truths")
    dares_available = await check_url(DARES_URL, "Dares")
    
    if not truths_available:
        logging.warning(f"URL с вопросами недоступен: {TRUTHS_URL}")
    
    if not dares_available:
        logging.warning(f"URL с заданиями недоступен: {DARES_URL}")
    
    # Запускаем бота
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        # Запускаем бота
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot stopped!")