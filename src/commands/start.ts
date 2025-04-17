import { InlineKeyboard } from 'grammy';
import { User } from '../models/User.js';
import { MyContext } from '../types.js';

export const start = async (ctx: MyContext) => {
  if (!ctx.from) {
    return ctx.reply('Error: User information not available');
  }
  const { id, first_name, username } = ctx.from;

  try {
    const existingUser = await User.findOne({ telegramId: id });
    const keyboard = new InlineKeyboard().text('Меню', 'menu');

    if (existingUser) {
      return ctx.reply(
        'Вы уже зарегистрированы. Чтобы перейти в магазин, нажмите на кнопку "Меню"',
        {
          reply_markup: keyboard,
        },
      );
    }

    const newUser = new User({
      telegramId: id,
      firstName: first_name,
      username,
    });
    await newUser.save();

    ctx.reply(
      'Вы успешно зарегистрированы! Чтобы перейти в магазин, нажмите на кнопку "Меню"',
      {
        reply_markup: keyboard,
      },
    );
  } catch (error) {
    console.error('Ошибка при регистрации пользователя:', error);
    ctx.reply('Произошла ошибка, попробуйте позже.');
  }
};
