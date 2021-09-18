require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const baseurl = process.env.NODE_ENV === 'production' ? process.env.HOST_PRODUCTION : process.env.HOST_DEVELOPMENT;
/* if (!globalThis.fetch) {
	globalThis.fetch = fetch;
} */

async function fetchWhatsappProgress() {
    const formGetProgress = new FormData();
    formGetProgress.append('auth', process.env.AUTH_KEY);
    const responseGetProgress = await fetch(baseurl+process.env.REST_GET_PROGRESS, {method: 'POST',body: formGetProgress});
    const whatsapps = await responseGetProgress.json();
    if(whatsapps.metadata.code === 200){
        for(let whatsapp of whatsapps.response) {
            const formUpdateProgress = new FormData();
            formUpdateProgress.append('auth', process.env.AUTH_KEY);
            formUpdateProgress.append('id', whatsapp.id);
            await fetch(baseurl+process.env.REST_UPDATE_PROGRESS, {method: 'POST',body: formUpdateProgress});
        }
    }
}

fetchWhatsappProgress();