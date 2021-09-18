require('dotenv').config();
const fs = require('fs');
const { Client, Location } = require('whatsapp-web.js');
const cron = require('node-cron');
const fetch = require('node-fetch');
const FormData = require('form-data');
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
const baseurl = process.env.NODE_ENV === 'production' ? process.env.HOST_PRODUCTION : process.env.HOST_DEVELOPMENT;
const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });

client.initialize();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {
    
    if (msg.body.toUpperCase() == '!PING') {
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto ')) {
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!echo ')) {
        msg.reply(msg.body.slice(6));
    } else if (msg.body == '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `Bot memiliki ${chats.length} obrolan terbuka.`);
    } else if (msg.body == '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
            *Info koneksi*
            Username: ${info.pushname}
            Nomor: ${info.me.user}
            Platform: ${info.platform}
            Versi WhatsApp: ${info.phone.wa_version}
        `);
    } else if (msg.body.toUpperCase() == '!LOKASI') {
        msg.reply(new Location(-6.9059025,109.7228905, 'Dinas Kesehatan Kabupaten Batang\nOPD Inovasi Terbaik'));
    } else if (msg.body == '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hai @${contact.number}!`, {
            mentions: [contact]
        });
    } else if (msg.body == '!delete' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe) {
            quotedMsg.delete(true);
        } else {
            msg.reply('Hanya dapat menghapus pesan saya sendiri');
        }
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        chat.archive();
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        chat.sendStateTyping();        
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        chat.sendStateRecording();        
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        chat.clearState();        
    } else {
        msg.reply('Mohon maaf *format pesan* anda salah.\n\nJika ingin melakukan pendaftaran *Vaksinasi Online* silahkan menggunakan aplikasi '+baseurl);
    }
});

client.on('message_create', (msg) => {
    if (msg.fromMe) {
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    console.log(after);
    if (before) {
        console.log(before);
    }
});

client.on('message_revoke_me', async (msg) => {
    console.log(msg.body);
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    console.log('update', notification);
});

client.on('change_battery', (batteryInfo) => {
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

async function fetchWhatsappProgress() {
    const formGetProgress = new FormData();
    formGetProgress.append('auth', process.env.AUTH_KEY);
    const responseGetProgress = await fetch(baseurl+process.env.REST_GET_PROGRESS, {method: 'POST',body: formGetProgress});
    const whatsapps = await responseGetProgress.json();
    if(whatsapps.metadata.code === 200){
        for(let whatsapp of whatsapps.response) {
            await client.sendMessage(whatsapp.phone, whatsapp.message);
            const formUpdateProgress = new FormData();
            formUpdateProgress.append('auth', process.env.AUTH_KEY);
            formUpdateProgress.append('id', whatsapp.id);
            await fetch(baseurl+process.env.REST_UPDATE_PROGRESS, {method: 'POST',body: formUpdateProgress});
        }
    }
}

cron.schedule("* * * * *", () => {
    fetchWhatsappProgress()
}, { timezone: "Asia/Jakarta" })