const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
require("dotenv").config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

const greetedUsers = new Set();
const userMessageCounts = new Map();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("✅ ¡QR Escaneado! Autenticado correctamente. Sincronizando chats (esto puede tardar unos minutos)...");
});

client.on("auth_failure", msg => {
  console.error("❌ Fallo en la autenticación:", msg);
});

client.on("ready", () => {
  console.log("🚀 ¡BOT READY Y ESCUCHANDO MENSAJES!");
});

async function getGeminiResponse(messageText) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text:
                  "Eres un bot de WhastApp creado por Guillermo López, pero tienes uso de razonamiento porque eres Gemini la AI de Google, ahora debes responder el siguiente mensaje que acabas de recibir (y debes decir del mensaje [Bot Gemini AI creador por Guillermo López] :" +
                  messageText,
              },
            ],
          },
        ],
      },
      {
        params: { key: GEMINI_API_KEY },
        headers: { "Content-Type": "application/json" },
      }
    );

    return (
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text.trim() ||
      "No pude generar una respuesta. Inténtalo nuevamente."
    );
  } catch (error) {
    console.error(
      "Error en la API de Gemini:",
      error.response?.data || error.message
    );
    return "Ocurrió un error al obtener una respuesta de la IA.";
  }
}

client.on("message_create", async (message) => {
  const user = message.from;
  const messageText = message.body.toLowerCase().trim();

  // 1. Filtrar: Solo continuamos si el mensaje empieza por "!gemini"
  if (!messageText.startsWith("!gemini")) {
    return; // Si no empieza por !gemini, el bot simplemente ignora el mensaje
  }

  // 2. Extraer la pregunta (quitamos los primeros 7 caracteres de "!gemini")
  const prompt = message.body.substring(7).trim();

  // Si el usuario pone "!gemini" pero no escribe nada más
  if (!prompt) {
    await message.reply("Por favor, escribe una pregunta. Ejemplo: !gemini ¿De qué color es el cielo?");
    return;
  }

  // 3. Sistema de conteo de mensajes (mantenemos tu lógica original)
  let userData = userMessageCounts.get(user);
  const now = Date.now();

  if (!userData) {
    userData = { count: 1, firstMessageTime: now };
  } else {
    const timeElapsed = now - userData.firstMessageTime;
    if (timeElapsed > 3600000) {
      userData.count = 1;
      userData.firstMessageTime = now;
    } else {
      userData.count += 1;
    }
  }

  console.log("userData: ", userData);
  userMessageCounts.set(user, userData);

  if (userData.count > 15) {
    await message.reply(
      "Lo siento, alcanzaste el límite de preguntas por hora."
    );
    return;
  }

  // 4. Enviar la pregunta a Gemini
  try {
    // IMPORTANTE: Pasamos 'prompt' en lugar de 'message.body' para no enviar la palabra "!gemini" a la IA
    const aiResponse = await getGeminiResponse(prompt);
    await message.reply(aiResponse);
  } catch (error) {
    console.error("Error al procesar mensaje:", error);
    await message.reply("Lo siento, hubo un error al procesar tu mensaje.");
  }
});

console.log("⏳ Mandando la orden de abrir Chrome...");

client.initialize()
  .then(() => console.log("✅ La orden de inicialización terminó correctamente."))
  .catch(err => console.error("❌ Error crítico durante la inicialización:", err));
// --- Servidor web fantasma para engañar a Render ---
const http = require('http');
const port = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot de WhatsApp funcionando correctamente.\n');
}).listen(port, () => {
  console.log(`Servidor fantasma escuchando en el puerto ${port} para Render.`);
});