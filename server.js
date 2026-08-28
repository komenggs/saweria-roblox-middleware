const express = require("express");
const axios   = require("axios");
const app     = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
//   KONFIGURASI - EDIT BAGIAN INI
// =============================================
const CONFIG = {
  // Roblox Open Cloud API Key
  // Buat/regenerate di: https://create.roblox.com/credentials
ROBLOX_API_KEY: process.env.ROBLOX_API_KEY || "",
  
  // Universe ID game Roblox kamu
  // Cek di: https://create.roblox.com/dashboard/creations
  ROBLOX_UNIVERSE_ID: "10762240169",

  // Topic MessagingService (harus sama persis dengan di script Roblox)
  MESSAGING_TOPIC: "SaweriaNotif",

  // Secret token dari Saweria (opsional tapi disarankan untuk keamanan)
  // Isi jika Saweria mengirim header Authorization atau X-Saweria-Token
  SAWERIA_SECRET: "",

  PORT: process.env.PORT || 3000,
};

// =============================================
//   HELPER: Parse jumlah donasi dengan benar
//   Saweria kirim "5.036" (titik = ribuan di ID)
//   tonumber("5.036") = 5.036 → SALAH
//   Solusi: hapus semua non-digit dulu
// =============================================
function parseAmount(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Math.floor(raw);
  // Hapus semua karakter bukan digit (titik, koma, spasi, Rp, dll)
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const result  = parseInt(cleaned, 10);
  return isNaN(result) ? 0 : result;
}

// =============================================
//   HELPER: Kirim ke Roblox via Open Cloud
// =============================================
async function sendToRoblox(data) {
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.ROBLOX_UNIVERSE_ID}/topics/${CONFIG.MESSAGING_TOPIC}`;

  const messageStr = JSON.stringify(data);

  // Roblox MessagingService max message size: 1024 bytes
  if (Buffer.byteLength(messageStr, "utf8") > 1000) {
    console.warn("[Roblox] Pesan terlalu panjang, pesan dipotong.");
    data.pesan = data.pesan ? data.pesan.substring(0, 100) : "";
  }

  const response = await axios.post(
    url,
    { message: JSON.stringify(data) },
    {
      headers: {
        "x-api-key":     CONFIG.ROBLOX_API_KEY,
        "Content-Type":  "application/json",
      },
      timeout: 10000, // 10 detik timeout
    }
  );

  return response.status === 200;
}

// =============================================
//   MIDDLEWARE: Log semua request masuk
// =============================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================
//   ROUTE: Webhook dari Saweria
// =============================================
app.post("/saweria-webhook", async (req, res) => {
  console.log("\n========== DONASI MASUK ==========");
  console.log("[Webhook] Body mentah:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  // Validasi: body harus ada isinya
  if (!body || Object.keys(body).length === 0) {
    console.warn("[Webhook] Body kosong, abaikan.");
    return res.status(400).json({ error: "Body kosong" });
  }

  // ── Parse data donasi ──
  // Saweria bisa kirim berbagai field name, semua di-cover di sini
  const donatur = String(
    body.donator_name  ||
    body.donor_name    ||
    body.name          ||
    body.username      ||
    body.from          ||
    "Anonim"
  ).trim().substring(0, 50); // max 50 karakter

  const jumlah = parseAmount(
    body.amount_raw     ||  // ← field utama Saweria
    body.amount         ||
    body.jumlah         ||
    body.total          ||
    body.donation_amount||
    0
);

  const pesan = String(
    body.message ||
    body.pesan   ||
    body.msg     ||
    body.comment ||
    ""
  ).trim().substring(0, 200); // max 200 karakter

  const donationData = {
    donatur,
    jumlah,
    pesan,
    timestamp: new Date().toISOString(),
  };

  console.log("[Donation] Data yang akan dikirim ke Roblox:", donationData);

  // Validasi jumlah
  if (jumlah <= 0) {
    console.warn("[Webhook] Jumlah donasi 0 atau tidak valid, tetap dikirim.");
    // Tetap dikirim supaya nama donatur tetap muncul di board
  }

  // ── Kirim ke Roblox ──
  try {
    const success = await sendToRoblox(donationData);
    if (success) {
      console.log("[Roblox] ✅ Notifikasi berhasil dikirim!");
      console.log("===================================\n");
      return res.status(200).json({
        status:  "ok",
        message: "Notifikasi terkirim ke Roblox",
        data:    donationData,
      });
    } else {
      console.error("[Roblox] ❌ Gagal mengirim notifikasi (status bukan 200)");
      return res.status(500).json({ error: "Gagal kirim ke Roblox" });
    }
  } catch (err) {
    const errData = err.response?.data;
    const errMsg  = err.message;
    console.error("[Error] Gagal kirim ke Roblox:");
    console.error("  Status :", err.response?.status);
    console.error("  Message:", errMsg);
    console.error("  Detail :", JSON.stringify(errData, null, 2));

    // Cek error umum dan beri pesan yang jelas
    if (err.response?.status === 401) {
      console.error("  → API Key tidak valid atau sudah expired! Update ROBLOX_API_KEY.");
    } else if (err.response?.status === 404) {
      console.error("  → Universe ID tidak ditemukan! Cek ROBLOX_UNIVERSE_ID.");
    } else if (err.response?.status === 429) {
      console.error("  → Rate limit! Terlalu banyak request.");
    }

    return res.status(500).json({
      error:   "Internal server error",
      detail:  errData || errMsg,
    });
  }
});

// =============================================
//   ROUTE: Test manual kirim donasi
//   POST /test-donation
//   Body: { donatur, jumlah, pesan }
// =============================================
app.post("/test-donation", async (req, res) => {
  console.log("\n========== TEST DONATION ==========");

  const donationData = {
    donatur: String(req.body.donatur || "TestUser").substring(0, 50),
    jumlah:  parseAmount(req.body.jumlah || 50000),
    pesan:   String(req.body.pesan   || "Test donasi!").substring(0, 200),
    timestamp: new Date().toISOString(),
  };

  console.log("[Test] Kirim:", donationData);

  try {
    const success = await sendToRoblox(donationData);
    console.log("[Test] Hasil:", success ? "✅ Berhasil" : "❌ Gagal");
    return res.status(success ? 200 : 500).json({
      status: success ? "ok" : "error",
      data:   donationData,
    });
  } catch (err) {
    console.error("[Test] Error:", err.response?.data || err.message);
    return res.status(500).json({
      error:  "Gagal kirim",
      detail: err.response?.data || err.message,
    });
  }
});

// =============================================
//   ROUTE: Health check
// =============================================
app.get("/", (req, res) => {
  res.json({
    status:       "✅ Server berjalan!",
    timestamp:    new Date().toISOString(),
    universe_id:  CONFIG.ROBLOX_UNIVERSE_ID,
    topic:        CONFIG.MESSAGING_TOPIC,
    api_key_set:  CONFIG.ROBLOX_API_KEY !== "ISI_API_KEY_BARU_DISINI" && CONFIG.ROBLOX_API_KEY !== "",
  });
});

// =============================================
//   START SERVER
// =============================================
app.listen(CONFIG.PORT, () => {
  console.log(`\n✅ Server berjalan di port ${CONFIG.PORT}`);
  console.log(`📡 Webhook URL  : http://localhost:${CONFIG.PORT}/saweria-webhook`);
  console.log(`🧪 Test URL     : POST http://localhost:${CONFIG.PORT}/test-donation`);
  console.log(`❤️  Health check : GET  http://localhost:${CONFIG.PORT}/\n`);

  if (CONFIG.ROBLOX_API_KEY === "ISI_API_KEY_BARU_DISINI" || CONFIG.ROBLOX_API_KEY === "") {
    console.warn("⚠️  PERINGATAN: ROBLOX_API_KEY belum diisi! Update dulu sebelum dipakai.");
  }
  if (CONFIG.SAWERIA_SECRET === "") {
    console.warn("⚠️  SAWERIA_SECRET kosong. Disarankan diisi untuk keamanan webhook.");
  }
});
