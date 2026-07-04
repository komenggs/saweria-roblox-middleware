// ============================================================
// test-saweria.js
// Script untuk test endpoint /test-donation di server Saweria kamu
// Cara pakai: node test-saweria.js
// ============================================================

// Bisa diisi lewat argument terminal, atau pakai default di bawah ini
// Contoh: node test-saweria.js https://saweria-roblox-middleware.onrender.com
const BASE_URL = process.argv[2] || "https://saweria-roblox-middleware.onrender.com";

// Daftar skenario test
const scenarios = [
  {
    label: "1. Donasi normal",
    body: { donatur: "TestUser123", jumlah: 25000, pesan: "Semangat terus ya!" },
  },
  {
    label: "2. Donasi dengan keyword 'mya' (harus di-highlight ungu)",
    body: { donatur: "MyaFans", jumlah: 50000, pesan: "buat mya yang cantik" },
  },
  {
    label: "3. Donasi tanpa pesan",
    body: { donatur: "SilentDonor", jumlah: 15000, pesan: "" },
  },
  {
    label: "4. Donasi jumlah besar (cek top donor / podium)",
    body: { donatur: "BigSpender", jumlah: 500000, pesan: "top donor test" },
  },
  {
    label: "5. Donasi tanpa nama (harus fallback ke 'TestUser')",
    body: { jumlah: 10000, pesan: "anonim test" },
  },
  {
    label: "6. Donasi jumlah 0 / tidak valid",
    body: { donatur: "ZeroAmount", jumlah: 0, pesan: "jumlah nol" },
  },
  {
    label: "7. Nama & pesan sangat panjang (cek truncation)",
    body: {
      donatur: "A".repeat(80),
      jumlah: 5000,
      pesan: "B".repeat(300),
    },
  },
];

async function runTest(scenario) {
  console.log(`\n=== ${scenario.label} ===`);
  console.log("Kirim:", JSON.stringify(scenario.body));

  try {
    const res = await fetch(`${BASE_URL}/test-donation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario.body),
    });

    const data = await res.json();
    console.log(`Status HTTP: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log("✅ Berhasil");
    } else {
      console.log("❌ Gagal");
    }
  } catch (err) {
    console.log("❌ Error koneksi:", err.message);
  }
}

async function runHealthCheck() {
  console.log("=== Health Check ===");
  try {
    const res = await fetch(BASE_URL);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    if (!data.api_key_set) {
      console.warn("⚠️  ROBLOX_API_KEY belum diisi di server!");
    }
  } catch (err) {
    console.log("❌ Gagal konek ke server:", err.message);
    console.log("   Kemungkinan: server sedang spin-down (Render free tier) atau URL salah.");
    console.log("   Coba buka URL-nya sekali di browser dulu untuk 'membangunkan' server, lalu jalankan ulang script ini.");
  }
}

async function main() {
  console.log(`Target server: ${BASE_URL}\n`);

  await runHealthCheck();

  for (const scenario of scenarios) {
    await runTest(scenario);
    // Jeda kecil biar tidak spam server & gampang dibaca lognya
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\n=== Selesai ===");
  console.log("Sekarang cek di Roblox Studio Output apakah semua entry di atas muncul di board dengan benar.");
}

main();
