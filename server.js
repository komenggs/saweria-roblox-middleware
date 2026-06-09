const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
//   KONFIGURASI - EDIT BAGIAN INI
// =============================================
const CONFIG = {
  // Roblox Open Cloud API Key
  // Buat di: https://create.roblox.com/credentials
  ROBLOX_API_KEY: "bcnMJ5/K6ke0Vh0P6pGfwgwohiNkOzBpGmWL+BfftE3AAZIyZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW1KamJrMUtOUzlMTm10bE1GWm9NRkEyY0VkbWQyZDNiMmhwVG10UGVrSndSMjFYVEN0Q1ptWjBSVE5CUVZwSmVTSXNJbTkzYm1WeVNXUWlPaUk1TURreU5ERTBNallpTENKbGVIQWlPakUzT0RFd01UQXdNRGdzSW1saGRDSTZNVGM0TVRBd05qUXdPQ3dpYm1KbUlqb3hOemd4TURBMk5EQTRmUS5ucU5sLUpqRDgxaVd4bS1tRGp4UVUtclNJWHFhTDloek5nazJZckhLcTBlYjZOWDhCc24yXzVzNUZCWjd1Y1g2M2FfU0plT2Q1eFRhSE5jX01FenUtWGx0VzBSVzVtMmh0TG0yTFBMYmcyekhUZjFyNWItUVl1eGJaTk9DWnE2NDMxcTJPbWc0U0ZWYmRpdFh2dVBYcEFnaXdMZk43TUFROUJGNmtTQUtkNE1UejBSa3NBNnRoY1JhSmR1VEVSczhWd2cyNGd0aFZqT1FlRVlkUlBOSXR2NmdkaHMzdnRBZW5tSmtYOHVBTXBlQUpLWVItUVRPT0dOYnY4VkVNTmpVbXp3ZmlxVHI5SGVFQkxhQmZyNlZxWjk3WmRSdktkM2I0WF9wcUFhenJ0QVg1T0U1MnJubXd1UDJfdjIzWG5QQ3JLdjRxNlYyTGFzaGZlVW1oaTlacVE=",

  // Universe ID game Roblox kamu
  ROBLOX_UNIVERSE_ID: "9748210057",

  // Topic untuk MessagingService (harus sama dengan di script Roblox)
  MESSAGING_TOPIC: "SaweriaNotif",

  PORT: process.env.PORT || 3000,
};
// =============================================

// Kirim pesan ke Roblox via Open Cloud MessagingService
async function sendToRoblox(data) {
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.ROBLOX_UNIVERSE_ID}/topics/${CONFIG.MESSAGING_TOPIC}`;

  const payload = {
    message: JSON.stringify(data),
  };

  const response = await axios.post(url, payload, {
    headers: {
      "x-api-key": CONFIG.ROBLOX_API_KEY,
      "Content-Type": "application/json",
    },
  });

  return response.status === 200;
}

// Route utama: menerima webhook dari Saweria
app.post("/saweria-webhook", async (req, res) => {
  console.log("[Webhook] Incoming request from Saweria");
  console.log("[Webhook] Body:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  // Ambil data donasi dari payload Saweria
  const donationData = {
    donatur: body.donator_name || body.name || "Anonim",
    jumlah: body.amount || 0,
    pesan: body.message || "",
    timestamp: new Date().toISOString(),
  };

  console.log("[Donation] Data:", donationData);

  try {
    const success = await sendToRoblox(donationData);
    if (success) {
      console.log("[Roblox] Notifikasi berhasil dikirim!");
      return res.status(200).json({ status: "ok", message: "Notifikasi terkirim" });
    } else {
      console.error("[Roblox] Gagal mengirim notifikasi");
      return res.status(500).json({ error: "Gagal kirim ke Roblox" });
    }
  } catch (err) {
    console.error("[Error]", err.response?.data || err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Server berjalan!", timestamp: new Date().toISOString() });
});

app.listen(CONFIG.PORT, () => {
  console.log(`✅ Server berjalan di port ${CONFIG.PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${CONFIG.PORT}/saweria-webhook`);
});
