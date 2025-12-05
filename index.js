const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// TOKEN VA KANAL
const token = "7929409228:AAFqx018RYnGDcA3uVos-RuZov07a3Jx3bQ";
const channel = "@durbekk1";
const contactUsername = "@durbekk_1";
const orderLink = "https://web-bot-durbek.vercel.app/";

const bot = new TelegramBot(token, { polling: true });

// SAVATLAR
const carts = {};

// === API DAN MAHSULOTLARNI OLIB KELISH ===
async function getProducts() {
  try {
    const res = await axios.get("https://durbek-webbot-node-1.onrender.com/api/products");

    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.products)) return res.data.products;

    return [];
  } catch (err) {
    console.log("API ERROR:", err.message);
    return [];
  }
}

// === OBUNA TEKSHIRISH ===
async function checkSubscribe(userId) {
  try {
    const member = await bot.getChatMember(channel, userId);
    return (
      member.status === "member" ||
      member.status === "administrator" ||
      member.status === "creator"
    );
  } catch (err) {
    return false;
  }
}

// === START VA BOSH SAHIFA ===
function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "🎉 Asosiy menyu:", {
    reply_markup: {
      keyboard: [
        ["📕 Katalog"],
        ["🛒 Savat", "🛍 Buyurtma berish"],
        ["ℹ️ Biz haqimizda", "💬 Bog‘lanish"]
      ],
      resize_keyboard: true
    }
  });
}

// === MESSAGE HANDLER ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // OBUNA CHECK
  const isSub = await checkSubscribe(userId);
  if (!isSub) {
    bot.sendMessage(chatId, "❗ Botdan foydalanish uchun kanalimizga obuna bo‘ling:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Kanalga obuna bo‘lish", url: `https://t.me/${channel.replace("@", "")}` }],
          [{ text: "♻️ Obunani tekshirish", callback_data: "check_sub" }]
        ]
      }
    });
    return;
  }

  if (text === "/start") {
    return sendMainMenu(chatId);
  }

  // === 📕 KATALOG ===
  if (text === "📕 Katalog") {
    const products = await getProducts();

    if (!products.length)
      return bot.sendMessage(chatId, "❗ Mahsulotlar topilmadi");

    for (const p of products) {

      // Rasmni to‘g‘ri olish
      const img =
        p.img ||
        p.image ||
        (p.images && p.images[0]) ||
        "https://via.placeholder.com/300?text=No+Image";

      await bot.sendPhoto(chatId, img, {
        caption: `*${p.name}*\n💵 Narxi: ${p.price} so'm`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛒 Savatga qo‘shish", callback_data: `add_${p._id}` }],
            [{ text: "📄 Batafsil", callback_data: `product_${p._id}` }]
          ]
        }
      });
    }

    return;
  }

  // === 🛒 SAVAT ===
  if (text === "🛒 Savat") {
    const cart = carts[chatId] || [];

    if (!cart.length)
      return bot.sendMessage(chatId, "🛒 Savat hozircha bo‘sh");

    let txt = "🛒 *Savatdagi mahsulotlar:*\n\n";
    cart.forEach(item => {
      txt += `*${item.name}*\n💵 Narxi: ${item.price} so'm\n🔢 Soni: ${item.count}\n\n`;
    });

    bot.sendMessage(chatId, txt, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🧹 Savatni tozalash", callback_data: "clear" }]]
      }
    });

    return;
  }

  // === 🛍 BUYURTMA ===
  if (text === "🛍 Buyurtma berish") {
    bot.sendMessage(chatId, "🛒 Buyurtma berish uchun link:");
    bot.sendMessage(chatId, orderLink);
    return;
  }

  // === ℹ️ BIZ HAQIMIZDA ===
  if (text === "ℹ️ Biz haqimizda") {
    bot.sendMessage(chatId, "🛍 *apple_nmg_bot* – sifatli telefonlar do‘koni! 🚀", {
      parse_mode: "Markdown"
    });
    return;
  }

  // === 💬 BOG‘LANISH ===
  if (text === "💬 Bog‘lanish") {
    bot.sendMessage(chatId, `📩 Aloqa: ${contactUsername}`);
    return;
  }
});

// === CALLBACK HANDLER ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  const products = await getProducts();

  // === OBUNANI QAYTA TEKSHIRISH ===
  if (data === "check_sub") {
    const isSub = await checkSubscribe(query.from.id);

    if (isSub) {
      bot.sendMessage(chatId, "✅ Obuna tasdiqlandi!");
      sendMainMenu(chatId);
    } else {
      bot.sendMessage(chatId, "❗ Hali obuna bo‘lmadingiz");
    }

    return;
  }

  // === 🛒 SAVATGA QO‘SHISH ===
  if (data.startsWith("add_")) {
    const id = data.split("_")[1];
    const product = products.find(p => p._id === id);
    if (!product) return;

    if (!carts[chatId]) carts[chatId] = [];

    const cart = carts[chatId];
    const exist = cart.find(i => i._id === id);

    if (exist) exist.count++;
    else cart.push({ ...product, count: 1 });

    bot.answerCallbackQuery(query.id, { text: "🛒 Savatga qo‘shildi!" });
    return;
  }

  // === 📄 BATAFSIL ===
  if (data.startsWith("product_")) {
    const id = data.split("_")[1];
    const p = products.find(i => i._id === id);
    if (!p) return;

    const img =
      p.img ||
      p.image ||
      (p.images && p.images[0]) ||
      "https://via.placeholder.com/300?text=No+Image";

    bot.sendPhoto(chatId, img, {
      caption: `*${p.name}*\n💵 Narxi: ${p.price} so'm\n📄 Tavsif: ${p.description || "Tavsif mavjud emas"}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➕", callback_data: `plus_${p._id}` },
            { text: "➖", callback_data: `minus_${p._id}` }
          ],
          [{ text: "🛒 Savatga qo‘shish", callback_data: `add_${p._id}` }]
        ]
      }
    });

    return;
  }

  // === ➕ SONI OSHIRISH ===
  if (data.startsWith("plus_")) {
    const id = data.split("_")[1];
    const cart = carts[chatId];
    if (!cart) return;

    const item = cart.find(i => i._id === id);
    if (!item) return;

    item.count++;
    bot.answerCallbackQuery(query.id, { text: "➕ Soni oshirildi" });
    return;
  }

  // === ➖ SONI KAMAYTIRISH ===
  if (data.startsWith("minus_")) {
    const id = data.split("_")[1];
    const cart = carts[chatId];
    if (!cart) return;

    const item = cart.find(i => i._id === id);
    if (!item) return;

    if (item.count > 1) item.count--;
    else cart.splice(cart.indexOf(item), 1);

    bot.answerCallbackQuery(query.id, { text: "➖ Soni kamaytirildi" });
    return;
  }

  // === 🧹 SAVATNI TOZALASH ===
  if (data === "clear") {
    carts[chatId] = [];
    bot.sendMessage(chatId, "🧹 Savat tozalandi!");
    return;
  }
});
