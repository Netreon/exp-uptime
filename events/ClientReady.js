const { Events } = require('discord.js');
const fs = require('fs');
const jsonData = fs.readFileSync('croxydb/croxydb.json');
const data = JSON.parse(jsonData);
const uptimeData = data.uptime;
const allUptimeValues = uptimeData.filter(value => typeof value === 'string');
const axios = require('axios');
async function pingURL(url) {
    await axios.get(url).catch(() => {return})
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
        console.log(`${client.user.tag} olarak giriş yapıldı!`)
        allUptimeValues.forEach(async (value) => {
            await pingURL(value)
        })
        setInterval(() => {
            allUptimeValues.forEach(async (value) => {
                await pingURL(value)
            })
        }, 150000);
	},
};