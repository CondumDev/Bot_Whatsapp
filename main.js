const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
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
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--disable-extensions',
            '--disable-notifications',
            '--js-flags="--max-old-space-size=256"'
        ]
    }
});

// --- EVENTOS DEL SISTEMA LIMPIOS ---
client.on("qr", (qr) => {
  console.log("🤖 Escanea este código QR con tu WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Sincronizando WhatsApp: ${percent}% - ${message}`);
});

client.on("disconnected", (reason) => {
  console.error("❌ El bot se ha desconectado o Chrome ha muerto. Razón:", reason);
});

client.on("authenticated", () => {
  console.log("✅ ¡QR Escaneado! Autenticado correctamente.");
});

client.on("auth_failure", msg => {
  console.error("❌ Fallo en la autenticación:", msg);
});

client.on("ready", () => {
  console.log("🚀 ¡BOT READY Y ESCUCHANDO MENSAJES!");
});

// --- SISTEMA DE MEMORIA Y API DE GEMINI ---
const conversationHistory = new Map();

async function getGeminiResponse(prompt, user) {
  try {
    let history = conversationHistory.get(user) || [];

    history.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        system_instruction: {
          parts: [{ text: "Eres un asistente útil de WhatsApp. Responde de forma directa, natural y conversacional. No hagas introducciones repetitivas, no saludes todo el rato y no menciones el nombre del usuario constantemente. Ve al grano." }]
        },
        contents: history 
      },
      {
        params: { key: GEMINI_API_KEY },
        headers: { "Content-Type": "application/json" },
      }
    );

    const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "No pude generar una respuesta.";

    history.push({
      role: "model",
      parts: [{ text: aiText }]
    });

    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }
    
    conversationHistory.set(user, history);

    return aiText;

  } catch (error) {
    console.error("Error en Gemini:", error.message);
    if (error.response && error.response.status === 429) {
      return "⏳ ¡Uf! Estoy yendo muy rápido y Google me ha puesto en pausa. Espera un minuto y vuelve a preguntarme.";
    }
    return "Ocurrió un error al obtener una respuesta de la IA.";
  }
}

// --- ESCUCHA DE MENSAJES Y COMANDOS ---
client.on("message_create", async (message) => {
  const messageText = message.body.toLowerCase().trim();

  // 🎨 COMANDO: !imagina
  if (messageText.startsWith("!imagina")) {
    const imagePrompt = message.body.substring(9).trim();
    
    if (!imagePrompt) {
      await message.reply("Por favor, dime qué quieres que dibuje. Ejemplo: !imagina un gato astronauta en marte");
      return;
    }

    await message.reply("🎨 Pintando tu obra de arte, dame unos segundos...");
    
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;
      const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
      await message.reply(media, null, { caption: "✨ Creado por tu IA" });
    } catch (error) {
      console.error("Error al generar imagen:", error);
      await message.reply("Lo siento, se me rompió el pincel. Intenta con otra descripción.");
    }
    return;
  }

  // 🧠 COMANDO: !gemini
  if (!messageText.startsWith("!gemini")) return; 

  const prompt = message.body.substring(7).trim();
  if (!prompt) {
    await message.reply("Por favor, escribe una pregunta. Ejemplo: !gemini ¿De qué color es el cielo?");
    return;
  }

  const user = message.from; 

  try {
    const aiResponse = await getGeminiResponse(prompt, user);
    await message.reply(aiResponse);
  } catch (error) {
    console.error("Error al procesar mensaje:", error);
    await message.reply("Lo siento, hubo un error al procesar tu mensaje.");
  }
});

// --- ARRANQUE DEL BOT ---
console.log("⏳ Mandando la orden de abrir Chrome...");
client.initialize()
  .then(() => console.log("✅ La orden de inicialización terminó correctamente."))
  .catch(err => console.error("❌ Error crítico:", err));