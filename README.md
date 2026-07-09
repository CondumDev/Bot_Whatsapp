# 🤖 WhatsApp AI Bot: Gemini 2.5 & Image Generator

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

A powerful, standalone WhatsApp bot powered by Node.js and `whatsapp-web.js`. This bot integrates **Google's Gemini 2.5 Flash** for intelligent, context-aware conversations and **Pollinations AI** for instant image generation directly within your WhatsApp chats.

---

## ✨ Features

* **🧠 Smart Conversations:** Uses the blazing-fast Gemini 2.5 Flash model to answer questions, write code, or just chat.
* **🎨 Image Generation:** Instantly turn text prompts into high-quality images.
* **🔒 Privacy-First Memory:** The bot remembers the context of the conversation, but keeps a strict separation between different users and groups. Your secrets are safe.
* **⚡ Session Persistence:** No need to scan the QR code every time you restart. The authentication session is securely saved locally.

---

## 🛠️ Commands

| Command | Action | Example |
| :--- | :--- | :--- |
| `!gemini` | Asks a question to the AI | `!gemini How does quantum computing work?` |
| `!imagina` | Generates an image | `!imagina A cyberpunk cat reading a book in neon lights` |

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You will need to have installed:
1. Node.js (v18 or higher recommended)
2. Git
3. A free API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone this repository to your local machine:
   ```bash
   git clone (https://github.com/CondumDev/Bot_Whatsapp.git)
   Navigate to the project directory and install the required dependencies:
    Bash

    npm install

    Create a secret environment file:
    Create a file named .env in the root directory and add your Google Gemini API Key:
    Plaintext

    GEMINI_API_KEY=your_api_key_here

Running the Bot

Start the application by running:
Bash

node main.js

A QR code will be printed in your terminal. Open your WhatsApp mobile app, go to Linked Devices, and scan the QR code. Once authenticated, the bot is ready to listen to your commands!
⚠️ Security Notice

If you fork or clone this project, never upload your .env file or your .wwebjs_auth folder to GitHub.
This repository already includes a .gitignore file that prevents these sensitive files from being tracked by Git. Keep it that way to protect your personal WhatsApp session and API Keys.
📜 License

This project is open-source and available for educational purposes. Feel free to fork, modify, and improve it!


***
