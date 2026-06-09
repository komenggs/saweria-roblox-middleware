const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
//   KONFIGURASI - EDIT BAGIAN INI
// =============================================
const CONFIG = {
  // Token dari Saweria (Settings > Webhook)
  SAWERIA_TOKEN: "ISI_SAWERIA_WEBHOOK_TOKEN_KAMU",

  // Roblox Open Cloud API Key
  // Buat di: https://create.roblox.com/credentials
  ROBLOX_API_KEY: "ISI_ROBLOX_API_KEY_KAMU",

  // Universe ID game Roblox kamu
  // Bisa dilihat di Roblox Studio > Game Settings > Basic Info
  ROBLOX_UNIVERSE_ID: "ISI_UNIVERSE_ID_KAMU",

  // Topic untuk MessagingService (harus sama dengan di script Roblox)
  MESSAGING_TOPIC: "SaweriaNotif",

  PORT: process.env.PORT || 3000,
};
// =============================================

// Verifikasi signature dari Saweria
function verifySaweriaSignature(req) {
  const signature = req.headers["x-saweria-callback-token"];
  return signature === CONFIG.SAWERIA_TOKEN;
}

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

  // Verifikasi token
  if (!verifySaweriaSignature(req)) {
    console.warn("[Webhook] Invalid token! Request ditolak.");
    return res.status(401).json({ error: "Unauthorized" });
  }

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
