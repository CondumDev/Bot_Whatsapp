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

const userMessageCounts = new Map();

// --- NUEVAS VARIABLES PARA LA PÁGINA WEB ---
let currentQR = "";
let botStatus = "Iniciando navegador en la nube...";

client.on("qr", (qr) => {
  currentQR = qr;
  botStatus = "Esperando escaneo del QR";
  console.log("¡Nuevo QR generado! Entra al enlace web de Render para escanearlo cómodamente.");
  qrcode.generate(qr, { small: true }); // Lo dejamos en la terminal de Render por si acaso
});

client.on("authenticated", () => {
  currentQR = "";
  botStatus = "¡Autenticado y conectado a WhatsApp!";
  console.log("✅ ¡QR Escaneado! Autenticado correctamente.");
});

client.on("auth_failure", msg => {
  console.error("❌ Fallo en la autenticación:", msg);
});

client.on("ready", () => {
  botStatus = "¡Bot READY y funcionando al 100%!";
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
                  "Eres un bot de WhatsApp creado por Guillermo López, pero tienes uso de razonamiento porque eres Gemini la AI de Google. Responde a esto (di primero que eres un Bot creado por Guillermo): " +
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
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Error en Gemini:", error.message);
    return "Ocurrió un error al obtener una respuesta de la IA.";
  }
}

client.on("message_create", async (message) => {
  const messageText = message.body.toLowerCase().trim();
  if (!messageText.startsWith("!gemini")) return; 

  const prompt = message.body.substring(7).trim();
  if (!prompt) {
    await message.reply("Por favor, escribe una pregunta. Ejemplo: !gemini ¿De qué color es el cielo?");
    return;
  }

  const user = message.from;
  let userData = userMessageCounts.get(user);
  const now = Date.now();

  if (!userData) {
    userData = { count: 1, firstMessageTime: now };
  } else {
    if (now - userData.firstMessageTime > 3600000) {
      userData.count = 1;
      userData.firstMessageTime = now;
    } else {
      userData.count += 1;
    }
  }
  userMessageCounts.set(user, userData);

  if (userData.count > 15) {
    await message.reply("Lo siento, alcanzaste el límite de preguntas por hora.");
    return;
  }

  try {
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
  .catch(err => console.error("❌ Error crítico:", err));


// --- SERVIDOR WEB MEJORADO (Tu página web para el QR) ---
const http = require('http');
const port = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  
  if (currentQR) {
    // Si hay un QR listo, lo convertimos en imagen usando una API gratuita y segura
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentQR)}`;
    res.end(`
      <html lang="es">
        <head><title>Escanear QR - Bot WhatsApp</title></head>
        <body style="text-align: center; font-family: Arial, sans-serif; background: #f0f2f5; padding-top: 50px;">
          <h2>🤖 Escanea este código con tu WhatsApp</h2>
          <p style="color: #555;">(Si la imagen no carga o no funciona, recarga la página F5)</p>
          <div style="background: white; padding: 20px; display: inline-block; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <img src="${qrImageUrl}" alt="Código QR de WhatsApp" style="width: 300px; height: 300px;"/>
          </div>
        </body>
      </html>
    `);
  } else {
    // Si no hay QR (porque está arrancando o ya escaneaste)
    res.end(`
      <html lang="es">
        <head><title>Estado del Bot</title></head>
        <body style="text-align: center; font-family: Arial, sans-serif; padding-top: 50px;">
          <h2>Estado del Bot: <span style="color: #25D366;">${botStatus}</span></h2>
          <p>Puedes cerrar esta pestaña cuando el bot esté READY.</p>
        </body>
      </html>
    `);
  }
}).listen(port, () => {
  console.log(`Servidor web activo. Visita la URL de Render para ver el estado o el QR.`);
});