import 'dotenv/config';
import { CallbackQueryContext, InlineKeyboard } from 'grammy';
import { MyContext } from '../types.js';
import { products } from '../consts/products.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';

export const payment = async (ctx: CallbackQueryContext<MyContext>) => {
  ctx.answerCallbackQuery();
  const productId = ctx.callbackQuery.data.split('-')[1];
  const product = products.find((p) => p.id === parseInt(productId));
  if (!product) {
    return ctx.callbackQuery.message?.editText(
      'Кажется, что-то пошло не так... Попробуйте выбрать другой товар или обратитесь в поддержку.',
    );
  }

  try {
    // chat id нужен для отправки инвойса
    const chatId = ctx.chat?.id;
    if (!chatId) {
      throw new Error(`${ctx.callbackQuery.data} | Chat ID is not defined`);
    }

    // данные для чека согласно документации юкасса
    // подробнее: https://yookassa.ru/docs/support/payments/onboarding/integration/cms-module/telegram
    const providerInvoiceData = {
      receipt: {
        items: [
          {
            description: product.description,
            quantity: 1,
            amount: {
              value: `${product.price}.00`,
              currency: 'RUB',
            },
            vat_code: 1,
          },
        ],
      },
    };

    // метод для отправки инвойса, принимает chat id, название товара,
    // описание, id, код валюты, массив с ценами и информацию о провайдере
    // для совершения платежа
    ctx.api.sendInvoice(
      chatId,
      product.name,
      product.description,
      product.id.toString(),
      'RUB',
      [
        {
          label: 'Руб',
          amount: product.price * 100,
        },
      ],
      {
        provider_token: process.env.PAYMENT_TOKEN,
        need_email: true,
        send_email_to_provider: true,
        provider_data: JSON.stringify(providerInvoiceData),
      },
    );
  } catch (error) {
    await ctx.reply(
      'Произошла ошибка при оплате. Пожалуйста, попробуйте позже или обратитесь в поддержку.',
    );
  }
};


export const telegramSuccessfulPaymentHandler = async (ctx: MyContext) => {
  if (!ctx.message?.successful_payment || !ctx.from) {
    return ctx.reply('Произошла ошибка при обработке платежа. Пожалуйста, обратитесь в поддержку.');
  }

  const { invoice_payload, total_amount } = ctx.message.successful_payment;
  const productId = parseInt(invoice_payload);
  const price = total_amount / 100;

  try {
    // Находим пользователя по telegramId
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      return ctx.reply('Пользователь не найден. Пожалуйста, обратитесь в поддержку.');
    }

    // Создаем новый заказ в БД
    await Order.create({
      userId: user._id,
      productId,
      price,
    });

    await ctx.reply('Оплата прошла успешно!', {
      reply_markup: new InlineKeyboard().text('Меню', 'menu'),
    });
  } catch (error) {
    console.error('Error creating order:', error);
    await ctx.reply('Произошла ошибка при сохранении заказа. Пожалуйста, обратитесь в поддержку.');
  }
};
