// index.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { TOKEN, ADMIN_ID } = require('./settings');

// Tambahkan di bagian atas file index.js
const moment = require("moment");

// Fungsi format rupiah
function formatRupiah(num) {
  return `Rp${num.toLocaleString("id-ID")}`;
}

const bot = new TelegramBot(TOKEN, { polling: true });
let db = JSON.parse(fs.readFileSync('database.json'));

const STOCKS = ['APP', 'COCA', 'SPRITE', 'AAN'];

// Simulasi harga saham
setInterval(() => {
  let teksUpdate = '📊 *Update Harga Saham Terbaru:*\n\n';

  STOCKS.forEach(stock => {
    const oldPrice = db.prices[stock];
    const naik = Math.random() < 0.5; // 50% kemungkinan naik
    const change = naik
      ? Math.random() * 15       // Naik 0% - 15%
      : Math.random() * -2;      // Turun 0% - -8%

    const rawPrice = oldPrice * (1 + change / 100);
    const newPrice = Math.max(100, Math.round(rawPrice));
    db.prices[stock] = newPrice;

    const arah = change > 0 ? '📈 Naik' : '📉 Turun';
    teksUpdate += `• ${stock}: ${arah} menjadi Rp${newPrice.toLocaleString('id-ID')} (${change.toFixed(2)}%)\n`;
  });

  fs.writeFileSync('database.json', JSON.stringify(db, null, 2));

  Object.keys(db.users).forEach(id => {
    bot.sendMessage(id, teksUpdate, { parse_mode: 'Markdown' });
  });
}, 60000); // Setiap 10 detik
// Helper
function saveDB() {
  fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
}

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      saldo: 10000,
      portofolio: {},
      riwayat: []
    };
  }
  return db.users[id];
}

// Start command
  bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  getUser(chatId);
  saveDB();

  const imageUrl = 'https://i.imgur.com/4QfKuz1.jpg'; // Ganti jika perlu

  const caption = `Selamat datang di *AYO INVESTASI!*\n\nGunakan menu tombol di bawah untuk mulai:\n\n• Cek harga saham\n• Investasi beli/jual\n• Lihat saldo & portofolio\n• Pantau leaderboard\n• Pinjam modal\n• Bayar pinjaman\n• Cek kredit & riwayat`;

  const options = {
    caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📈 Harga", callback_data: "harga" },
          { text: "💰 Saldo", callback_data: "saldo" }
        ],
        [
          { text: "📊 Portofolio", callback_data: "portofolio" },
          { text: "🧾 Riwayat", callback_data: "riwayat" }
        ],
        [
          { text: "🏆 Leaderboard", callback_data: "leaderboard" },
          { text: "⭐ Kreditku", callback_data: "kreditku" }
        ],
        [
          { text: "💸 Pinjam", callback_data: "pinjam" },
          { text: "✔️ Bayar Pinjam", callback_data: "bayarpinjam" }
        ],
        [
          { text: "🛒 Beli", callback_data: "beli" },
          { text: "📤 Jual", callback_data: "jual" }
        ],
        [
          { text: "👤 Admin", url: "https://t.me/AanzCuyxzzz" }
        ]
      ]
    }
  };

  bot.sendPhoto(chatId, imageUrl, options);
});

bot.on('callback_query', callbackQuery => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  switch (data) {
    case 'harga':
    case 'saldo':
    case 'portofolio':
    case 'riwayat':
    case 'leaderboard':
    case 'kreditku':
    case 'bayarpinjam':
      bot.processUpdate({ message: { chat: { id: chatId }, text: '/' + data } });
      break;
    case 'pinjam':
      bot.sendMessage(chatId, 'Masukkan jumlah pinjaman dengan perintah:\n\n`/pinjam [jumlah]`\n\nContoh: `/pinjam 50000`', { parse_mode: 'Markdown' });
      break;
    case 'beli':
      bot.sendMessage(chatId, 'Gunakan perintah:\n\n`/beli [kode] [lot]`\n\nContoh: `/beli ABC 10`', { parse_mode: 'Markdown' });
      break;
    case 'jual':
      bot.sendMessage(chatId, 'Gunakan perintah:\n\n`/jual [kode] [lot]`\n\nContoh: `/jual ABC 5`', { parse_mode: 'Markdown' });
      break;
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

// Cek harga
bot.onText(/\/harga/, (msg) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  if (!db.prices || Object.keys(db.prices).length === 0) {
    return bot.sendMessage(chatId, 'Harga saham belum tersedia.');
  }

  // Menentukan badge berdasarkan level atau total investasi
  const totalInvestasi = Object.keys(user.portofolio || {}).reduce((sum, kode) => {
    return sum + (user.portofolio[kode] * (db.prices[kode] || 0));
  }, 0);
  const totalKekayaan = user.saldo + totalInvestasi;

  let badge = '🟤 Pemula';
  if (totalKekayaan >= 5000000) badge = '🔵 Trader';
  if (totalKekayaan >= 20000000) badge = '🟣 Investor Pro';
  if (totalKekayaan >= 50000000) badge = '🟡 Sultan Market';

  // Status pinjaman
  let statusPinjaman = 'Tidak ada pinjaman aktif.';
  if (user.pinjaman && user.pinjaman > 0) {
    statusPinjaman = `Pinjaman Aktif: Rp${user.pinjaman.toLocaleString('id-ID')} (Bunga 10%)`;
  }

  let teks = `📈 *Harga Saham Saat Ini:*\n\n`;
  for (const kode in db.prices) {
    const harga = Math.round(db.prices[kode]);
    teks += `• ${kode}: Rp${harga.toLocaleString('id-ID')}\n`;
  }

  teks += `\n🎖️ *Badge:* ${badge}`;
  teks += `\n💳 *Status Pinjaman:* ${statusPinjaman}`;

  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
});

// Beli saham
bot.onText(/\/beli (\w+) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const [_, kodeRaw, lotStr] = match;
  const kode = kodeRaw.toUpperCase();
  const user = getUser(chatId);
  const lot = parseInt(lotStr);

  if (!STOCKS.includes(kode)) return bot.sendMessage(chatId, 'Kode saham tidak valid.');

  const harga = db.prices[kode];
  const totalHarga = harga * lot;

  if (user.saldo < totalHarga) return bot.sendMessage(chatId, 'Saldo tidak cukup.');

  // Kurangi saldo
  user.saldo -= totalHarga;

  // Update portofolio
  user.portofolio[kode] = (user.portofolio[kode] || 0) + lot;

  // Hitung dan simpan harga beli rata-rata
  user.beliHarga = user.beliHarga || {};
  const prevLot = user.portofolio[kode] - lot; // sebelum ditambah
  const prevAvg = user.beliHarga[kode] || 0;

  const totalLot = prevLot + lot;
  const avgPrice = ((prevLot * prevAvg) + (lot * harga)) / totalLot;
  user.beliHarga[kode] = Math.round(avgPrice);

  // Simpan riwayat
  user.riwayat.push(`Beli ${kode} ${lot} lot - Rp${totalHarga.toLocaleString('id-ID')}`);
  saveDB();

  // Kirim pesan
  const teks = `
📈 *Transaksi Pembelian Berhasil!*

Saham: ${kode}
Lot dibeli: ${lot}
Harga per Lot: Rp${harga.toLocaleString('id-ID')}
-------------------------------
🧾 Total: Rp${totalHarga.toLocaleString('id-ID')}
📊 Harga Beli Rata-rata: Rp${user.beliHarga[kode].toLocaleString('id-ID')}

Selamat! Portofolio kamu makin kuat!
  `.trim();

  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
});

// Jual saham
bot.onText(/\/jual (\w+) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const [_, kodeRaw, lotStr] = match;
  const kode = kodeRaw.toUpperCase();
  const user = getUser(chatId);
  const lot = parseInt(lotStr);

  if (!STOCKS.includes(kode)) return bot.sendMessage(chatId, 'Kode saham tidak valid.');
  if ((user.portofolio[kode] || 0) < lot) return bot.sendMessage(chatId, 'Saham tidak mencukupi untuk dijual.');

  const hargaJual = db.prices[kode];
  const hargaBeli = user.beliHarga?.[kode] || hargaJual; // fallback kalau belum ada
  const totalJual = hargaJual * lot;
  const totalModal = hargaBeli * lot;
  const selisih = totalJual - totalModal;
  const status = selisih > 0 ? 'Untung' : 'Rugi';

  user.saldo += totalJual;
  user.portofolio[kode] -= lot;
  if (user.portofolio[kode] === 0) delete user.beliHarga?.[kode];

  user.riwayat.push(`Jual ${kode} ${lot} lot - Rp${totalJual.toLocaleString('id-ID')}`);
  saveDB();

  const teks = `
📉 *Transaksi Penjualan Berhasil!*

Saham: ${kode}
Lot: ${lot}
Harga Jual: Rp${hargaJual.toLocaleString('id-ID')}
Harga Beli: Rp${hargaBeli.toLocaleString('id-ID')}
-------------------------------
💸 Total: Rp${totalJual.toLocaleString('id-ID')}
${status === 'Untung' ? '📈 Kamu *untung*' : '📉 Kamu *rugi*'} sebesar Rp${Math.abs(selisih).toLocaleString('id-ID')}

${
  status === 'Untung'
    ? 'Mantap! Investasi kamu berbuah manis!'
    : 'Jangan khawatir, pasar pasti akan naik lagi!'
}
  `.trim();

  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
});

// Saldo
bot.onText(/\/saldo/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  // Hitung total kekayaan (saldo + investasi)
  const totalInvestasi = Object.keys(user.portofolio || {}).reduce((sum, kode) => {
    return sum + (user.portofolio[kode] * (db.prices[kode] || 0));
  }, 0);
  const totalKekayaan = user.saldo + totalInvestasi;

  // Tentukan badge
  let badge = '🟤 Pemula';
  if (totalKekayaan >= 5000000) badge = '🔵 Trader';
  if (totalKekayaan >= 20000000) badge = '🟣 Investor Pro';
  if (totalKekayaan >= 50000000) badge = '🟡 Sultan Market';

  // Status pinjaman
  let statusPinjaman = 'Tidak ada pinjaman aktif.';
  if (user.pinjaman && user.pinjaman > 0) {
    statusPinjaman = `Pinjaman Aktif: Rp${user.pinjaman.toLocaleString('id-ID')} (Bunga 10%)`;
  }

  const teks = `💳 *Saldo Kamu:* Rp${user.saldo.toLocaleString('id-ID')}\n\n` +
               `🎖️ *Badge:* ${badge}\n` +
               `📊 *Total Kekayaan:* Rp${totalKekayaan.toLocaleString('id-ID')}\n` +
               `📌 *Status Pinjaman:* ${statusPinjaman}`;

  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
});

// Portofolio
bot.onText(/\/portofolio/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  if (!user.portofolio || Object.keys(user.portofolio).length === 0) {
    return bot.sendMessage(chatId, 'Kamu belum punya saham di portofolio. Mulai investasi sekarang dan raih cuan!');
  }

  let text = '💼 *Portofolio Investasi Kamu:*\n\n';
  let totalInvestasi = 0;

  for (let kode in user.portofolio) {
    const lot = user.portofolio[kode];
    const harga = db.prices[kode];
    const nilai = lot * harga;
    totalInvestasi += nilai;

    text += `• ${kode}: ${lot} lot (Rp${nilai.toLocaleString('id-ID')})\n`;
  }

  // Hitung total kekayaan
  const totalKekayaan = user.saldo + totalInvestasi;

  // Badge
  let badge = '🟤 Pemula';
  if (totalKekayaan >= 5000000) badge = '🔵 Trader';
  if (totalKekayaan >= 20000000) badge = '🟣 Investor Pro';
  if (totalKekayaan >= 50000000) badge = '🟡 Sultan Market';

  // Pinjaman
  let statusPinjaman = 'Tidak ada pinjaman aktif.';
  if (user.pinjaman && user.pinjaman > 0) {
    statusPinjaman = `Pinjaman Aktif: Rp${user.pinjaman.toLocaleString('id-ID')} (Bunga 10%)`;
  }

  text += `\n💰 *Total Nilai Investasi:* Rp${totalInvestasi.toLocaleString('id-ID')}` +
          `\n🎖️ *Badge:* ${badge}` +
          `\n📌 *Status Pinjaman:* ${statusPinjaman}`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Riwayat
bot.onText(/\/riwayat/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  let text = `📄 *Riwayat Transaksi Terakhir:*\n\n`;
  const logs = user.riwayat.slice(-10).reverse();
  text += logs.length
    ? logs.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'Belum ada transaksi.\nYuk mulai investasi sekarang!';

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Leaderboard
bot.onText(/\/leaderboard/, msg => {
  let ranking = Object.entries(db.users).map(([id, user]) => {
    let totalInvestasi = Object.keys(user.portofolio || {}).reduce((sum, kode) => {
      return sum + (user.portofolio[kode] * (db.prices[kode] || 0));
    }, 0);
    let total = user.saldo + totalInvestasi;

    // Tentukan badge
    let badge = '🟤 Pemula';
    if (total >= 5000000) badge = '🔵 Trader';
    if (total >= 20000000) badge = '🟣 Investor Pro';
    if (total >= 50000000) badge = '🟡 Sultan Market';

    return { id, total, badge };
  }).sort((a, b) => b.total - a.total);

  let text = '*🏆 Leaderboard Investor Terkaya:*\n\n';
  ranking.slice(0, 10).forEach((u, i) => {
    text += `${i + 1}. ID ${u.id} — Rp${u.total.toLocaleString('id-ID')} (${u.badge})\n`;
  });
  text += '\n🔥 Apakah kamu bisa masuk dalam daftar elit ini? Terus investasikan dengan bijak!';
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// ADMIN COMMANDS
bot.onText(/\/topup (\d+) (\d+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const [_, id, jumlah] = match;
  getUser(id).saldo += parseInt(jumlah);
  saveDB();
  bot.sendMessage(msg.chat.id, `✅ Top up ke ID ${id} sebesar Rp${parseInt(jumlah).toLocaleString()} berhasil.`);
});

bot.onText(/\/reset (\d+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const [_, id] = match;
  db.users[id] = {
    saldo: 100000000,
    portofolio: {},
    riwayat: []
  };
  saveDB();
  bot.sendMessage(msg.chat.id, `♻️ Data user ${id} telah di-reset ke default.`);
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const [_, pesan] = match;
  Object.keys(db.users).forEach(id => {
    bot.sendMessage(id, `*📢 PESAN ADMIN:*

${pesan}`, { parse_mode: 'Markdown' });
  });
  bot.sendMessage(msg.chat.id, '📨 Pesan broadcast berhasil dikirim ke semua pengguna.');
});


// Tambahan fitur admin

// /totaluser
bot.onText(/\/totaluser/, (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const total = Object.keys(db.users).length;
  bot.sendMessage(msg.chat.id, `Total pengguna: ${total}`);
});

// /hapus [id]
bot.onText(/\/hapus (\d+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const id = match[1];
  if (!db.users[id]) return bot.sendMessage(msg.chat.id, `User ${id} tidak ditemukan.`);
  delete db.users[id];
  saveDB();
  bot.sendMessage(msg.chat.id, `User ${id} berhasil dihapus.`);
});

// /statistik
bot.onText(/\/statistik/, (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  let tertinggi = { kode: '', harga: 0 }, terendah = { kode: '', harga: Infinity }, total = 0;
  STOCKS.forEach(kode => {
    let harga = db.prices[kode];
    total += harga;
    if (harga > tertinggi.harga) tertinggi = { kode, harga };
    if (harga < terendah.harga) terendah = { kode, harga };
  });
  const rata = (total / STOCKS.length).toFixed(2);
  bot.sendMessage(msg.chat.id, `Statistik Saham:\nTertinggi: ${tertinggi.kode} Rp${tertinggi.harga}\nTerendah: ${terendah.kode} Rp${terendah.harga}\nRata-rata: Rp${rata}`);
});

// /resetall
bot.onText(/\/resetall/, (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  for (let id in db.users) {
    db.users[id] = {
      saldo: 100000000,
      portofolio: {},
      riwayat: []
    };
  }
  saveDB();
  bot.sendMessage(msg.chat.id, `Semua user telah di-reset.`);
});

// /info [id]
bot.onText(/\/info (\d+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const id = match[1];
  const user = db.users[id];
  if (!user) return bot.sendMessage(msg.chat.id, `User ${id} tidak ditemukan.`);
  let text = `INFO USER ${id}\nSaldo: Rp${user.saldo.toLocaleString()}\n\nPortofolio:`;
  for (let kode in user.portofolio) {
    text += `\n- ${kode}: ${user.portofolio[kode]} lot`;
  }
  text += `\n\nRiwayat terakhir:\n` + (user.riwayat.slice(-5).join('\n') || 'Belum ada transaksi');
  bot.sendMessage(msg.chat.id, text);
});

// /setharga [kode] [harga]
bot.onText(/\/setharga (\w+) (\d+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  const kode = match[1].toUpperCase();
  const harga = parseInt(match[2]);

  if (!STOCKS.includes(kode)) {
    return bot.sendMessage(msg.chat.id, `Kode saham *${kode}* tidak ditemukan.`);
  }

  db.prices[kode] = harga;
  saveDB();

  bot.sendMessage(msg.chat.id, `Harga saham *${kode}* telah diubah menjadi *Rp${harga.toLocaleString("id-ID")}*`, { parse_mode: "Markdown" });
});

bot.onText(/\/pinjam (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  const jumlah = parseInt(match[1]);

  if (user.pinjaman && user.pinjaman > 0) {
    return bot.sendMessage(chatId, 'Kamu masih punya pinjaman yang belum dibayar. Selesaikan dulu ya!');
  }

  const bunga = Math.round(jumlah * 0.10); // bunga 10%
  user.pinjaman = jumlah + bunga;
  user.saldo += jumlah;
  user.riwayat.push(`Pinjam modal Rp${jumlah.toLocaleString('id-ID')} (Bunga 10%: Rp${bunga.toLocaleString('id-ID')})`);

  fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
  bot.sendMessage(chatId, `Kamu berhasil meminjam Rp${jumlah.toLocaleString('id-ID')} (Total yang harus dikembalikan: Rp${user.pinjaman.toLocaleString('id-ID')})`);
});

bot.onText(/\/kreditku/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  if (user.pinjaman && user.pinjaman > 0) {
    bot.sendMessage(chatId, `📌 Kamu punya pinjaman aktif sebesar Rp${user.pinjaman.toLocaleString('id-ID')}.\nBayar sekarang dengan perintah *\/bayarpinjam*`);
  } else {
    bot.sendMessage(chatId, `✅ Kamu tidak punya pinjaman aktif. Kamu bisa meminjam modal dengan perintah *\/pinjam jumlah*`);
  }
});

bot.onText(/\/bayarpinjam/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);

  if (!user.pinjaman || user.pinjaman === 0) {
    return bot.sendMessage(chatId, 'Kamu tidak punya pinjaman yang harus dibayar.');
  }

  if (user.saldo < user.pinjaman) {
    return bot.sendMessage(chatId, 'Saldo kamu tidak cukup untuk membayar pinjaman. Silakan top up atau jual saham dulu.');
  }

  user.saldo -= user.pinjaman;
  user.riwayat.push(`Bayar pinjaman Rp${user.pinjaman.toLocaleString('id-ID')}`);
  user.pinjaman = 0;

  fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
  bot.sendMessage(chatId, '✅ Pinjaman kamu berhasil dibayar lunas. Terima kasih sudah bertanggung jawab!');
});

// Game: Tebak Market
bot.onText(/\/tebak/, msg => {
  const chatId = msg.chat.id;
  const arah = Math.random() > 0.5 ? 'naik' : 'turun';
  db.tempTebak = db.tempTebak || {};
  db.tempTebak[chatId] = arah;

  bot.sendMessage(chatId, `Prediksi harga saham berikutnya akan *naik* atau *turun*?
Balas dengan: naik / turun`, { parse_mode: 'Markdown' });
});

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const jawaban = msg.text.toLowerCase();
  if (!db.tempTebak || !db.tempTebak[chatId]) return;

  const benar = db.tempTebak[chatId];
  delete db.tempTebak[chatId];

  if (jawaban === 'naik' || jawaban === 'turun') {
    if (jawaban === benar) {
      db.users[chatId].saldo += 3000;
      bot.sendMessage(chatId, `Benar! Kamu dapat Rp3.000. Saldo sekarang: Rp${db.users[chatId].saldo.toLocaleString('id-ID')}`);
    } else {
      bot.sendMessage(chatId, `Salah! Jawaban yang benar adalah *${benar}*`, { parse_mode: 'Markdown' });
    }
    saveDB();
  }
});

// Game: Bocoran Orang Dalam
bot.onText(/\/bocoran/, msg => {
  const chatId = msg.chat.id;
  const harga = 2000;
  const user = getUser(chatId);
  if (user.saldo < harga) return bot.sendMessage(chatId, `Saldo kamu kurang! Fitur ini butuh Rp${harga}`);

  user.saldo -= harga;
  const kode = randomItem(STOCKS);
  const prediksi = Math.random() > 0.4 ? 'naik' : 'turun';
  bot.sendMessage(chatId, `*Bocoran dari orang dalam:* ${kode} kemungkinan akan ${prediksi} hari ini.`, { parse_mode: 'Markdown' });
  saveDB();
});

// Game: Investasi Kilat
bot.onText(/\/kilat/, msg => {
  const chatId = msg.chat.id;
  const kode = randomItem(STOCKS);
  const harga = db.prices[kode];
  const lot = 1;
  const total = harga * lot;

  bot.sendMessage(chatId, `Kamu ditawari saham *${kode}* seharga Rp${harga}/lot. Mau beli? (ya/tidak)`, { parse_mode: 'Markdown' });

  db.kilat = db.kilat || {};
  db.kilat[chatId] = { kode, harga, waktu: Date.now() };
});

bot.on('message', msg => {
  const chatId = msg.chat.id;
  const teks = msg.text.toLowerCase();

  if (db.kilat && db.kilat[chatId]) {
    const data = db.kilat[chatId];
    if (teks === 'ya') {
      const user = getUser(chatId);
      if (user.saldo < data.harga) return bot.sendMessage(chatId, 'Saldo kamu tidak cukup.');
      user.saldo -= data.harga;
      user.portofolio[data.kode] = (user.portofolio[data.kode] || 0) + 1;
      bot.sendMessage(chatId, `Berhasil beli 1 lot ${data.kode}. Cek kembali setelah 5 menit.`);

      setTimeout(() => {
        const perubahan = Math.random() * 0.3 + 0.1; // 10%-40%
        const naik = Math.random() > 0.5;
        const hargaBaru = Math.round(data.harga * (naik ? (1 + perubahan) : (1 - perubahan)));
        const untung = naik ? hargaBaru - data.harga : -(data.harga - hargaBaru);

        user.saldo += hargaBaru;
        user.portofolio[data.kode]--;
        if (user.portofolio[data.kode] <= 0) delete user.portofolio[data.kode];

        bot.sendMessage(chatId, `Investasi kilat selesai! Harga ${data.kode} jadi Rp${hargaBaru}. Kamu ${naik ? 'untung' : 'rugi'} Rp${Math.abs(untung).toLocaleString('id-ID')}`);
        saveDB();
      }, 5 * 60 * 1000);
    }
    delete db.kilat[chatId];
  }
});

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Verifikasi penarikan
bot.onText(/\/verifpenarikan (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const [nomor, nama, metode] = match[1].split("|").map(v => v.trim());
  
  if (!nomor || !nama || !metode) return bot.sendMessage(chatId, 'Format salah. Contoh: /verifpenarikan 08xxxxx | Budi | DANA');

  const user = getUser(chatId);
  user.penarikan = { nomor, nama, metode };
  saveDB();

  bot.sendMessage(chatId, `✅ Verifikasi Berhasil!

Data penarikan kamu telah tersimpan:
• Nomor Tujuan : ${nomor}
• Nama Akun    : ${nama}
• Metode       : ${metode}

Sekarang kamu bisa melakukan penarikan dengan perintah /tarikcepat.`);
});

// Tarik cepat
bot.onText(/\/tarikcepat (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const jumlah = parseInt(match[1]);
  const user = getUser(chatId);

  if (!user.penarikan || !user.penarikan.nomor || !user.penarikan.nama || !user.penarikan.metode) {
    return bot.sendMessage(chatId, 'Kamu belum melakukan verifikasi penarikan. Gunakan perintah /verifpenarikan nomor | nama | metode');
  }
  if (jumlah < 50000) return bot.sendMessage(chatId, 'Minimal penarikan adalah Rp50.000');
  if (user.saldo < jumlah) return bot.sendMessage(chatId, 'Saldo kamu tidak mencukupi untuk penarikan ini.');

  user.saldo -= jumlah;
  if (!user.riwayatPenarikan) user.riwayatPenarikan = [];

  const penarikan = {
    nominal: jumlah,
    nomor: user.penarikan.nomor,
    nama: user.penarikan.nama,
    metode: user.penarikan.metode,
    status: 'Pending',
    tanggal: moment().format('DD MMM YYYY')
  };

  user.riwayatPenarikan.push(penarikan);
  saveDB();

  bot.sendMessage(chatId, `📤 Permintaan Penarikan Diterima

Detail Penarikan:
• Nominal     : ${formatRupiah(jumlah)}
• Tujuan      : ${penarikan.nomor}
• Nama Akun   : ${penarikan.nama}
• Metode      : ${penarikan.metode}
• Estimasi    : 1 - 5 hari kerja`);

  const opts = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Konfirmasi', callback_data: `konfirmasi_${chatId}_${jumlah}` },
        { text: '❌ Batalkan', callback_data: `batalkan_${chatId}_${jumlah}` }
      ]]
    }
  };

  bot.sendMessage(ADMIN_ID, `📬 *Notifikasi Penarikan Baru*

• Nama Telegram : @${msg.from.username || msg.from.first_name}
• Nominal       : ${formatRupiah(jumlah)}
• Nomor Tujuan  : ${penarikan.nomor}
• Nama Akun     : ${penarikan.nama}
• Metode        : ${penarikan.metode}

Status: Pending`, opts);
});

// Konfirmasi / Batalkan via tombol
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const [aksi, targetId, jumlah] = query.data.split("_");
  const user = getUser(targetId);
  
  if (!user || !user.riwayatPenarikan) return;
  const penarikan = user.riwayatPenarikan.find(r => r.nominal == jumlah && r.status === 'Pending');

  if (!penarikan) return;

  if (aksi === 'konfirmasi') {
    penarikan.status = 'Sukses';
    bot.sendMessage(targetId, `✅ Penarikan ${formatRupiah(jumlah)} telah berhasil diproses. Terima kasih telah menggunakan layanan kami.`);
  } else if (aksi === 'batalkan') {
    penarikan.status = 'Gagal';
    user.saldo += parseInt(jumlah);
    bot.sendMessage(targetId, `❌ Penarikan ${formatRupiah(jumlah)} dibatalkan. Saldo telah dikembalikan.`);
  }

  saveDB();
  bot.deleteMessage(chatId, query.message.message_id);
});

// Riwayat penarikan
bot.onText(/\/penarikan/, msg => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  const riwayat = user.riwayatPenarikan || [];

  if (riwayat.length === 0) return bot.sendMessage(chatId, 'Kamu belum pernah melakukan penarikan.');

  const teks = '📑 *Riwayat Penarikan Kamu:*\n\n' +
    riwayat.slice(-5).reverse().map((r, i) => `${i + 1}. ${formatRupiah(r.nominal)} - ${r.metode} - ${r.nomor} - ${r.status} - ${r.tanggal}`).join("\n");

  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
});
