const fs = require('fs');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Fungsi untuk membaca token dari file data.json
async function readTokensFromFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error("Error membaca file data.json:", err);
        return reject(err);
      }
      try {
        const jsonData = JSON.parse(data); // Parsing data JSON
        if (jsonData.tokens && Array.isArray(jsonData.tokens)) {
          resolve(jsonData.tokens.map(token => token.trim())); // Trim setiap token
        } else {
          reject("Format file JSON tidak valid.");
        }
      } catch (jsonError) {
        reject("Error parsing file JSON: " + jsonError);
      }
    });
  });
}

// Fungsi untuk membaca proxy dari file proxylist.txt (abaikan jika tidak ada proxy)
async function readProxiesFromFile(filePath) {
  return new Promise((resolve) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.warn("File proxylist.txt tidak ditemukan atau error, melanjutkan tanpa proxy.");
        return resolve([]); // Kembalikan array kosong jika tidak ada proxy
      }
      const proxies = data.trim().split('\n').filter(Boolean); // Hilangkan baris kosong
      resolve(proxies);
    });
  });
}

// Fungsi utama untuk menjalankan proses untuk semua akun
async function runForAllAccounts() {
  try {
    const tokens = await readTokensFromFile('data.json');
    const proxies = await readProxiesFromFile('proxylist.txt');
    console.log(`Menemukan ${tokens.length} akun dan ${proxies.length} proxy`);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null; // Gunakan proxy jika ada, atau null jika tidak
      console.log(`Akun ${i + 1} ${proxy ? `menggunakan proxy: ${proxy}` : 'tanpa proxy'}`);

      // Memanggil fungsi getUserRewards untuk setiap akun dengan atau tanpa proxy
      await getUserRewards(`Bearer ${token}`, i + 1, proxy);
    }
  } catch (error) {
    console.error("Error menjalankan untuk semua akun:", error);
  }
}

// Fungsi untuk mengambil reward tasks berdasarkan token dan proxy
async function getUserRewards(token, accountNumber, proxy) {
  try {
    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': token, // Token berbeda untuk setiap akun
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128"',
        'sec-ch-ua-platform': '"Windows"'
      }
    };

    if (proxy) {
      options.agent = new HttpsProxyAgent(proxy); // Atur proxy hanya jika ada
    }

    const response = await fetch('https://rewards.coub.com/api/v2/get_user_rewards', options);

    if (!response.ok) {
      console.error(`Akun ${accountNumber}: Error: Status HTTP ${response.status}`);
      return;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      console.log(`Akun ${accountNumber}: Task ditemukan (${data.length} task)`);
      const taskIds = data.map(task => task.id);
      startSpinner(); // Mulai animasi
      await completeTasks(taskIds, accountNumber, token, proxy); // Teruskan token di sini
      stopSpinner(); // Hentikan animasi setelah selesai
    } else {
      console.log(`Akun ${accountNumber}: Tidak ada task yang ditemukan.`);
    }
  } catch (error) {
    console.error(`Akun ${accountNumber}: Error mengambil data rewards:`, error);
  }
}

// Fungsi untuk menyelesaikan tasks berdasarkan ID dan proxy
async function completeTasks(taskIds, accountNumber, token, proxy) {
  try {
    const completedTaskIds = [];
    
    for (const taskId of taskIds) {
      const options = {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': token, // Pastikan token yang benar digunakan di sini
          'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128"',
          'sec-ch-ua-platform': '"Windows"'
        }
      };

      if (proxy) {
        options.agent = new HttpsProxyAgent(proxy); // Gunakan proxy jika ada
      }

      const response = await fetch(`https://rewards.coub.com/api/v2/complete_task?task_reward_id=${taskId}`, options);

      if (response.ok) {
        completedTaskIds.push(taskId); // Hanya catat jika task berhasil
      }
    }

    if (completedTaskIds.length > 0) {
      console.log(`Akun ${accountNumber}: Menyelesaikan task: ${completedTaskIds.join(', ')}`);
    } else {
      console.log(`Akun ${accountNumber}: Tidak ada task yang berhasil diselesaikan.`);
    }
  } catch (error) {
    console.error(`Akun ${accountNumber}: Error menyelesaikan task:`, error);
  }
}

// Array karakter spinner untuk animasi
const spinnerFrames = ['|', '/', '-', '\\'];
let spinnerIndex = 0;
let spinnerInterval;

// Fungsi untuk memulai animasi spinner
function startSpinner() {
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\rSedang menyelesaikan task ${spinnerFrames[spinnerIndex]}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  }, 200); // Kecepatan animasi
}

// Fungsi untuk menghentikan animasi spinner
function stopSpinner() {
  clearInterval(spinnerInterval);
  process.stdout.write('\rTask selesai!               \n'); // Menghapus spinner
}

// Fungsi untuk menghitung waktu sampai 00:01 UTC dan menunggu
function waitUntilMidnight() {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCDate(now.getUTCDate() + 1);
  nextRun.setUTCHours(0, 1, 0, 0); // Set ke jam 00:01 UTC

  const msUntilMidnight = nextRun.getTime() - now.getTime();

  console.log(`Menunggu hingga jam 00:01 UTC...`);
  showCountdown(msUntilMidnight);

  return new Promise(resolve => setTimeout(resolve, msUntilMidnight));
}

// Animasi countdown (dalam detik)
function showCountdown(milliseconds) {
  let secondsRemaining = Math.floor(milliseconds / 1000);

  const countdownInterval = setInterval(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    process.stdout.write(`\rWaktu tersisa: ${hours} jam ${minutes} menit ${seconds} detik   `);

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      console.log('\nMulai proses eksekusi...');
    }

    secondsRemaining--;
  }, 1000);
}

// Fungsi untuk menjalankan proses setiap hari pada jam 00:01 UTC
async function runAtMidnight() {
  while (true) {
    await runForAllAccounts();
    await waitUntilMidnight();
  }
}

// Panggil fungsi utama untuk menjalankan script pada jam 00:01 UTC
runAtMidnight();
