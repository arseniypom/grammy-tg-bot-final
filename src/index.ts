import 'dotenv/config';
import { Bot, GrammyError, HttpError, Context, InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';
import mongoose from 'mongoose';
import { MyContext } from './types';
import { start, payment, telegramSuccessfulPaymentHandler } from './commands';
import { User } from './models/User';
import { products } from './consts/products';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not defined');
}
const bot = new Bot<MyContext>(BOT_TOKEN);

bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.use(hydrate());

bot.on(':successful_payment', telegramSuccessfulPaymentHandler);

// Ответ на команду /start
bot.command('start', start);

bot.callbackQuery('menu', (ctx) => {
  ctx.answerCallbackQuery();
  ctx.callbackQuery.message?.editText(
    'Вы в главном меню Магазина.\nОтсюда Вы можете попасть в раздел с товарами и в свой профиль. Для перехода нажмите на кнопку ниже:',
    {
      reply_markup: new InlineKeyboard()
        .text('Товары', 'products')
        .text('Профиль', 'profile'),
    },
  );
});
bot.callbackQuery('products', (ctx) => {
  ctx.answerCallbackQuery();
  // Превращаем массив товаров в строку с информацией о каждом из них
  // Формат информации о каждом товаре будет такой:
  // 1. Товар 1
  // Цена: 100
  // Описание: ...
  const productsList = products.reduce((acc, cur) => {
    return (
      acc +
      `– ${cur.name}\nЦена: ${cur.price}руб.\nОписание: ${cur.description}\n`
    );
  }, '');

  // Объединяем список товаров и общий текст раздела:
  const messageText = `Все товары:\n${productsList}\nДля выбора товара и оплаты нажмите на кнопку ниже:`;

  // Динамически создаем кнопки на каждый товар
  const keyboardButtonRows = products.map((product) => {
    return InlineKeyboard.text(product.name, `buyProduct-${product.id}`);
  });
  // Добавляем кнопки в итоговую клавиатуру, на забывая оставить в конце кнопку "Назад"
  const keyboard = InlineKeyboard.from([
    keyboardButtonRows,
    [InlineKeyboard.text('← Назад', 'backToMenu')],
  ]);

  // Передаем текст и клавиатуру в editText
  ctx.callbackQuery.message?.editText(messageText, {
    reply_markup: keyboard,
  });
});
bot.callbackQuery('profile', async (ctx) => {
  ctx.answerCallbackQuery();

  const user = await User.findOne({ telegramId: ctx.from?.id });
  if (!user) {
    return ctx.callbackQuery.message?.editText(
      'Для доступа к профилю необходимо зарегистрироваться, используя команду /start',
    );
  }

  const registrationDate = user.createdAt.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  ctx.callbackQuery.message?.editText(
    `Здравствуйте, ${ctx.from?.first_name}!\nДата регистрации: ${registrationDate}\nУ Вас еще нет заказов. Для покупки перейдите в раздел "Товары"`,
    {
      reply_markup: new InlineKeyboard().text('← Назад', 'backToMenu'),
    },
  );
});
bot.callbackQuery('backToMenu', (ctx) => {
  ctx.answerCallbackQuery();
  ctx.callbackQuery.message?.editText(
    'Вы в главном меню Магазина.\nОтсюда Вы можете попасть в раздел с товарами и в свой профиль. Для перехода нажмите на кнопку ниже:',
    {
      reply_markup: new InlineKeyboard()
        .text('Товары', 'products')
        .text('Профиль', 'profile'),
    },
  );
});
bot.callbackQuery(/^buyProduct-\d+$/, payment);
// Ответ на любое сообщение
bot.on('message:text', (ctx) => {
  ctx.reply(ctx.message.text);
});

// Обработка ошибок согласно документации
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// Функция запуска бота
async function startBot() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    bot.start();
    console.log('MongoDB connected & bot started');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

startBot();
