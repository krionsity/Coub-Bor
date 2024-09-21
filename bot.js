const fs = require('fs');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

// Fungsi untuk menampilkan timer countdown secara dinamis dalam satu baris
function startCooldown(seconds, callback) {
    let remaining = seconds;

    const interval = setInterval(() => {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;

        // Menampilkan waktu yang tersisa dalam format jam:menit:detik dalam satu baris
        readline.cursorTo(process.stdout, 0); // Pindahkan kursor ke awal baris
        process.stdout.write(`Cooldown: ${hours}h ${minutes}m ${secs}s`);

        remaining--;

        if (remaining < 0) {
            clearInterval(interval);
            readline.cursorTo(process.stdout, 0); // Bersihkan baris setelah countdown selesai
            process.stdout.write('\n'); // Pindahkan ke baris baru setelah selesai
            callback(); // Panggil callback setelah cooldown selesai
        }
    }, 1000);
}

// Fungsi untuk membaca task list dari file tasklist.json
function readTaskListFromFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.log("Error membaca tasklist.json:", err);
                return reject(err);
            }
            const taskList = JSON.parse(data);
            resolve(taskList);
        });
    });
}

// Fungsi untuk membaca token dari file data.txt
function readTokensFromFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.log("Error membaca data.txt:", err);
                return reject(err);
            }
            const tokens = data.trim().split('\n');
            resolve(tokens);
        });
    });
}

// Fungsi untuk membaca proxy dari file proxylist.txt
function readProxiesFromFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.log("Tidak ada file proxylist.txt atau error membaca proxylist.txt, menjalankan tanpa proxy.");
                return resolve([]); // Jika file tidak ada, kembalikan array kosong
            }
            const proxies = data.trim().split('\n').filter(Boolean); // Hilangkan baris kosong
            resolve(proxies);
        });
    });
}

// Fungsi untuk membuat fetch dengan atau tanpa proxy
async function fetchWithProxy(url, options, proxy) {
    if (proxy) {
        const agent = new HttpsProxyAgent(proxy);
        return fetch(url, { ...options, agent });
    } else {
        return fetch(url, options); // Jika tidak ada proxy, fetch langsung tanpa proxy
    }
}

// Fungsi untuk mendapatkan informasi pengguna dengan proxy atau tanpa proxy menggunakan API update_regular_info
async function getUserInfo(accessToken, proxy) {
    try {
        console.log(`Menggunakan token: ${accessToken} dengan proxy: ${proxy || 'tanpa proxy'} untuk mendapatkan informasi pengguna`);

        const response = await fetchWithProxy("https://coub.com/api/v2/users/update_regular_info", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "baggage": "sentry-environment=production,sentry-release=f723e802,sentry-public_key=d4ff6e16d3786ab7f5be43b6611c8380,sentry-trace_id=326aa28327cf481fa843af5f74d17f8f,sentry-sample_rate=1,sentry-sampled=true",
                "content-type": "application/json",
                "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Microsoft Edge\";v=\"128\", \"Microsoft Edge WebView2\";v=\"128\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sentry-trace": "326aa28327cf481fa843af5f74d17f8f-851d02a9bc32c6a5-1",
                "cookie": "AMP_MKTG_7f6e3c8da0=JTdCJTdE; marker=18520011; remember_token=0e509d0ed625b7eb941bdc339ed83e4602192150; timeline_view_explore_timeline_view=list; _ga=GA1.1.715118868.1726791366; _ym_uid=1726791367757475411; _ym_d=1726791367; last_visited_at=1726803432942; _ga_57C6383EJ1=GS1.1.1726803427.2.1.1726803432.55.0.0; locale=en; is_logged_in=true; _cobb_session=...", // Sesuaikan cookie dengan yang valid
                "Referer": "https://coub.com/tg-app/daily-wallet",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify({
                "user": {
                    "ton_wallet_address": "0:4ba1cc6d197fc2a5460f3f2284f72a13f56b296a54a6f8b8bdc56d4498dc8fce" // Sesuaikan dengan alamat wallet yang benar
                }
            }),
            method: "PUT"
        }, proxy);

        const text = await response.text(); // Baca respons sebagai teks dulu

        // Cek apakah respons adalah JSON
        try {
            const data = JSON.parse(text); // Coba parse sebagai JSON
            if (data.user) {
                // Asumsikan balance ada di data.user.coub_balance
                const coubBalance = data.user.coub_balance; // Sesuaikan dengan struktur API yang benar
                console.log(`Nama: ${data.user.name}, Total $COUB balance: ${coubBalance}`);
                return data;
            } else {
                console.log("Error mendapatkan data pengguna:", data);
                return null;
            }
        } catch (jsonError) {
            console.log("Respons bukan JSON:", text); // Log respons yang tidak bisa di-parse
            return null;
        }
    } catch (error) {
        console.error("Error mendapatkan informasi pengguna:", error);
    }
}


// Fungsi untuk mengklaim tugas berdasarkan task id dengan proxy atau tanpa proxy
async function claimTask(accessToken, taskId, proxy) {
    try {
        const response = await fetchWithProxy("https://coub.com/api/v2/user_task_rewards", {
            headers: {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/json",
                "x-auth-token": accessToken,
                "Referer": "https://coub.com/tg-app/home",
            },
            body: JSON.stringify({
                task_reward_id: taskId
            }),
            method: "POST"
        }, proxy);

        const data = await response.json();
        if (data) {
            console.log(`Task ID ${taskId} berhasil diklaim.`);
        } else {
            console.log(`Gagal klaim task ID ${taskId}`);
        }
        return data;
    } catch (error) {
        console.error(`Error klaim task ID ${taskId}:`, error);
    }
}

// Fungsi untuk mencoba klaim tugas dengan proxy atau tanpa proxy
async function tryClaimTask(accessToken, taskId, proxy) {
    try {
        const response = await fetchWithProxy("https://analytics.coub.com//api/event", {
            headers: {
                "accept": "*/*",
                "content-type": "text/plain",
                "Referer": "https://coub.com/",
            },
            body: JSON.stringify({
                n: "task_claim",
                u: "https://coub.com/tg-app/home",
                d: "coub.com/tg-app",
                p: JSON.stringify({
                    username: "Naxdumay",
                    userId: 1106627137,
                    task_id: taskId
                })
            }),
            method: "POST"
        }, proxy);

        console.log("Klaim tugas berhasil dikirim.");
    } catch (error) {
        console.error("Error mengirim klaim tugas:", error);
    }
}

// Fungsi untuk klaim semua tugas dari task list dengan proxy atau tanpa proxy
async function claimAllTasksForUser(accessToken, taskList, proxy) {
    for (let task of taskList) {
        console.log(`Mengklaim task ${task.title} dengan ID ${task.id}`);
        await claimTask(accessToken, task.id, proxy);
        await tryClaimTask(accessToken, task.id, proxy);
    }
}

// Fungsi utama untuk menjalankan semua proses dengan multi proxy atau tanpa proxy
async function runForAllAccounts() {
    try {
        console.log("Memulai proses membaca token, proxy, dan task list...");

        // Membaca token dari file data.txt
        const tokens = await readTokensFromFile('data.txt');
        console.log(`Ditemukan ${tokens.length} token`);

        // Membaca proxy dari file proxylist.txt
        const proxies = await readProxiesFromFile('proxylist.txt');
        console.log(`Ditemukan ${proxies.length} proxy`);

        // Membaca task list dari file tasklist.json
        const taskList = await readTaskListFromFile('tasklist.json');
        console.log(`Task list berhasil dibaca, ada ${taskList.length} task.`);

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim(); // Trim untuk menghilangkan spasi atau karakter tak terlihat
            const proxy = proxies[i % proxies.length] || null; // Pilih proxy atau null jika tidak ada

            console.log(`Menjalankan untuk akun dengan token: ${token} dan proxy: ${proxy || 'tanpa proxy'}`);

            // Cek apakah token kosong atau salah
            if (!token || token.length === 0) {
                console.log(`Token tidak valid pada index ${i}, melewatkan akun ini.`);
                continue;
            }

            // Gunakan token dan proxy (jika ada) untuk klaim tugas
            const userInfo = await getUserInfo(token, proxy);

            if (!userInfo) {
                console.log(`Gagal mendapatkan informasi pengguna untuk token ${token}, melewatkan akun ini.`);
                continue;
            }

            // Klaim semua tugas dari task list untuk akun tersebut
            await claimAllTasksForUser(token, taskList, proxy);

            console.log(`Selesai untuk akun ${userInfo.user.name}`);
        }

        // Setelah semua akun selesai, tunggu 24 jam (cooldown) sebelum menjalankan lagi
        const cooldownSeconds = 24 * 60 * 60; // 24 jam dalam detik
        console.log("Menunggu selama 24 jam sebelum menjalankan lagi...");

        // Mulai timer countdown dengan satu baris dinamis
        startCooldown(cooldownSeconds, runForAllAccounts); // Panggil ulang fungsi setelah cooldown selesai
    } catch (error) {
        console.error("Error dalam proses:", error);

        // Jika terjadi error, tunggu 24 jam dan coba lagi
        const cooldownSeconds = 24 * 60 * 60; // 24 jam dalam detik
        console.log("Menunggu selama 24 jam sebelum mencoba lagi...");

        // Mulai timer countdown jika terjadi error
        startCooldown(cooldownSeconds, runForAllAccounts); // Panggil ulang fungsi setelah cooldown selesai
    }
}

// Test jalankan secara manual dengan cooldown 24 jam
console.log("Testing manual run dengan multi proxy dan cooldown...");
runForAllAccounts();
