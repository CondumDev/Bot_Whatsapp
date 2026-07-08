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
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--disable-extensions',
            '--disable-notifications',
            '--js-flags="--max-old-space-size=256"'
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

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Sincronizando WhatsApp: ${percent}% - ${message}`);
  botStatus = `Sincronizando chats: ${percent}% completado...`;
});

client.on("disconnected", (reason) => {
  console.error("❌ El bot se ha desconectado o Chrome ha muerto. Razón:", reason);
  botStatus = "Error: Desconectado por falta de memoria.";
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


// --- SERVIDOR WEB MEJORADO CON CÁMARA DE SEGURIDAD ---
const http = require('http');
const port = process.env.PORT || 10000;

http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // 📸 RUTA SECRETA PARA VER LA PANTALLA DE CHROME
  if (req.url === '/foto') {
    try {
      if (client && client.pupPage) {
        // Tomamos una captura de pantalla de Chrome en la nube
        const screenshot = await client.pupPage.screenshot({ encoding: 'base64' });
        res.writeHead(200);
        res.end(`
          <body style="text-align: center; font-family: Arial; background: #222; color: white;">
            <h2>📸 Cámara Espía de Chrome</h2>
            <p>Esto es EXACTAMENTE lo que está viendo el bot ahora mismo. F5 para actualizar.</p>
            <img src="data:image/png;base64,${screenshot}" style="max-width: 90%; border: 2px solid #25D366; border-radius: 10px;"/>
          </body>
        `);
      } else {
        res.writeHead(200);
        res.end('Chrome todavía no ha arrancado o se ha cerrado.');
      }
    } catch (error) {
      res.writeHead(500);
      res.end('Error al tomar la foto: ' + error.message);
    }
    return;
  }

  // 🌐 RUTA NORMAL (Para ver el QR)
  res.writeHead(200);
  if (currentQR) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentQR)}`;
    res.end(`
      <body style="text-align: center; font-family: Arial; padding-top: 50px;">
        <h2>🤖 Escanea este código</h2>
        <img src="${qrImageUrl}" style="width: 300px; height: 300px;"/>
      </body>
    `);
  } else {
    res.end(`
      <body style="text-align: center; font-family: Arial; padding-top: 50px;">
        <h2>Estado del Bot: <span style="color: #25D366;">${botStatus}</span></h2>
      </body>
    `);
  }
}).listen(port, () => {
  console.log(`Servidor web activo. Visita la URL de Render para ver el estado o el QR.`);
});