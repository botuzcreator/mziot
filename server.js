const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const devices = new Map(); // Device'larni saqlash uchun Map

// Ma'lumotlar bazasiga ulanish yoki yangi ma'lumotlar bazasi yaratish
const db = new sqlite3.Database('./mydb.sqlite3', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Ma\'lumotlar bazasiga ulandi.');
});

// sensor_data jadvalini yaratish
db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sanaVaVaqt TEXT,
  harorat REAL,
  namlik REAL,
  yoritilganlik REAL,
  nurlanish REAL,
  yoniqRang TEXT,
  ultHolati TEXT
)`);

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    

    
    try {
        const msg = JSON.parse(message);
        
        // Agar xabar 'request-data' so'rovini o'z ichiga olsa va table.js dan kelgan bo'lsa
        if (msg.type === 'request-data') {
          // Ma'lumotlar bazasidan so'rov yuborish va natijalarni faqat so'rov yuborgan klientga qaytarish
          const sql = `SELECT DATE(sanaVaVaqt) as sana, AVG(harorat) as avgHarorat, AVG(nurlanish) as avgNurlanish FROM sensor_data GROUP BY DATE(sanaVaVaqt) ORDER BY DATE(sanaVaVaqt) DESC LIMIT 5`;
    
          db.all(sql, [], (err, rows) => {
            if (err) {
              ws.send(JSON.stringify({ error: err.message }));
              return;
            }
            ws.send(JSON.stringify(rows));
          });
        }
      } catch (e) {
        // Agar xabar JSON emas bo'lsa, uni barcha klientlarga yuborish
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }


      try {
        const msg = JSON.parse(message);
    
        if (msg.type === 'control-data' && devices.has(msg.deviceId)) {
          console.log(`Qurilma ${msg.deviceId} uchun xabar : ${msg.data}`);
          const deviceWs = devices.get(msg.deviceId);
          if (deviceWs) {
            deviceWs.send(msg.data);  // Device'ga ma'lumot yuborish
            console.log(`Qurilma ${msg.deviceId} uchun xabar yuborildi.`);
          } else {
            console.log(`Device ${msg.deviceId} not found.`);
          }
        }
      } catch (e) {
        console.log('control data emas');
      }

        
          


    // Xabarni ajratish
    const messageText = message.toString();
    const data = messageText.split(';');
    if (data.length === 7) {
      const [harorat, namlik, yoritilganlik, nurlanish, yoniqRang, ultHolati, deviceId] = data;
      console.log(`Device ID: ${deviceId}`);
      // Device ID bilan bog'liq WebSocket'ni saqlab qo'yish
      // Agar device allaqachon ro'yxatdan o'tgan bo'lsa, uni qayta qo'shmaslik
      if (!devices.has(deviceId)) {
        // Device ID bilan bog'liq WebSocket'ni saqlab qo'yish
        devices.set(deviceId, ws);
        console.log(`Device registered: ${deviceId}`);
      } else {
        console.log(`Device ${deviceId} is already registered.`);
      }


    





      function getLocalDateTime() {
        const now = new Date();
        const offset = 5 * 60 * 60000; // GMT+5 uchun millisekundlarda vaqt farqi
        const localDateTime = new Date(now.getTime() + offset);
      
        const year = localDateTime.getUTCFullYear();
        const month = localDateTime.getUTCMonth() + 1; // Oylar 0 dan boshlanadi
        const day = localDateTime.getUTCDate();
        const hour = localDateTime.getUTCHours();
        const minute = localDateTime.getUTCMinutes();
        const second = localDateTime.getUTCSeconds();
      
        // Raqamlarni ikki xonali formatga olib kelish
        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      
        return `${formattedDate} ${formattedTime}`;
      }
      
      const sanaVaVaqt = getLocalDateTime();
      console.log(sanaVaVaqt);
      

      // Qabul qilingan ma'lumotlarni ma'lumotlar bazasiga kiritish
      const sql = `INSERT INTO sensor_data (sanaVaVaqt, harorat, namlik, yoritilganlik, nurlanish, yoniqRang, ultHolati) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(sql, [sanaVaVaqt, harorat, namlik, yoritilganlik, nurlanish, yoniqRang, ultHolati], (err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Sensor ma\'lumotlari ma\'lumotlar bazasiga saqlandi.');
      });
    }



    



    
  });
});


// Server yopilganda ma'lumotlar bazasini yopish
process.on('exit', () => {
  db.close();
});
