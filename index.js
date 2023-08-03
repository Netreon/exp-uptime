const express = require("express");
const passport = require("passport");
const session = require("express-session");
const { Strategy } = require("passport-discord");
const { ActionRowBuilder, Client, GatewayIntentBits, EmbedBuilder, Colors, ButtonStyle, ButtonBuilder } = require("discord.js");
const client = new Client({ intents: [Object.values(GatewayIntentBits)] })
const config = require("./config.js")
const db = require("croxydb")

const app = express();
const port = config.port;

app.set('view engine' , 'ejs');

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const strategy = new Strategy(
	{
		clientID: config.clientID,
		clientSecret: config.secret,
		callbackURL: `${config.link}/callback`,
		scope: ["identify"],
	},
	(_access_token, _refresh_token, user, done) =>
		process.nextTick(() => done(null, user)),
);

passport.use(strategy);

app.use(session({
		secret: config.secret,
		resave: false,
		saveUninitialized: false,
	}),
);
app.use(passport.session());
app.use(passport.initialize());

app.get("/giris",
	passport.authenticate("discord", {
		scope: ["identify"],
	}),
);

app.get("/callback",
	passport.authenticate("discord", {
		failureRedirect: "/hata",
	}),
	(_req, res) => res.redirect("/dashboard"),
);

app.get("/", (req, res) => {
    res.render("index")
});
app.get("/kurallar", (req, res) => {
    res.render("kurallar")
});
app.get("/dashboard", async (req, res) => {
	if (!req.user) return res.redirect("giris");

	if (db.has("uptimelinks_" + req.user.id)) {
		const links = db.fetch("uptimelinks_" + req.user.id);
		const alllinks = db.fetch("uptime")
		links.forEach((link) => {
			if (!alllinks.includes(link)) return db.unpush("uptimelinks_" + req.user.id, link)
		})
	}

	if (!db.has("uptimelinks_" + req.user.id)) {
		await db.push("uptimelinks_" + req.user.id, "please wait")
		await db.unpush("uptimelinks_" + req.user.id, "please wait")
	}


    const guild = client.guilds.cache.get(config.guild);
    if (req.user) {
        if (guild.members.cache.get(req.user.id)) {
			if (db.has("uptimelinks_" + req.user.id)) {
				const member = guild.members.cache.get(req.user.id)
				if (member.roles.cache.has(config.premiumrole)) {
					if (member.roles.cache.has(config.adminrole)) {
						res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: null })
					} else {
						res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: null })
					}
				} else {
					if (member.roles.cache.has(config.adminrole)) {
						res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: null })
					} else {
						res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: null })
					}
				}
			} else {
				const member = guild.members.cache.get(req.user.id)
				if (member.roles.cache.has(config.premiumrole)) {
					if (member.roles.cache.has(config.adminrole)) {
						res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: null })
					} else {
						res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: null })
					}
				} else {
					if (member.roles.cache.has(config.adminrole)) {
						res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: null })
					} else {
						res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: null })
					}
				}
			}
        } else {
            res.redirect(config.invite)
        }
    } else {
        res.redirect("/giris")
    }
});

app.get("/ekle", (req, res) => {
    const guild = client.guilds.cache.get(config.guild);
    if (req.user) {
        if (guild.members.cache.get(req.user.id)) {
            res.render("ekle", { username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL() })
        } else {
            res.redirect(config.invite)
        }
    } else {
        res.redirect("/giris")
    }
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	return res.redirect("/");
});

app.get("/invite", (req, res) => {
	return res.redirect(config.invite);
});

app.get("/links", (req, res) => {
	if (!req.user) return res.redirect("giris")
	if (db.has("uptimelinks_" + req.user.id)) {
		const guild = client.guilds.cache.get(config.guild);
		const links = db.fetch("uptimelinks_" + req.user.id).map(link => link.replace(/^https?:\/\//, ''));
		
		if (links.length < 1) {
			return res.render("links", { links: null, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL() });
		}
		
		return res.render("links", { links: links, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL() });
	} else {
		return res.redirect("dashboard")
	}
});

app.get("/yonetim", (req, res) => {
	if (!req.user) return res.redirect("giris")
	const guild = client.guilds.cache.get(config.guild);
  	const member = guild.members.cache.get(req.user.id);
	if (!member) return res.redirect(config.invite);
	if (!db.has("uptimelinks_" + req.user.id)) return res.redirect("dashboard");
	const links = db.fetch("uptime").map(link => link.replace(/^https?:\/\//, ''));
	if (!member.roles.cache.has(config.adminrole)) {
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		}
	}

	if (db.has("uptime")) {
		const guild = client.guilds.cache.get(config.guild);
		
		if (links.length < 1) {
			return res.render("yonetim", { links: null, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL() });
		}
		
		return res.render("yonetim", { links: links, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL() });
	} else {
		return res.redirect("dashboard")
	}
});

app.get("/resetdatabase", async (req, res) => {
	const datenow = { date: Date.now() };
	if (!req.user) return res.redirect("giris")
	const guild = client.guilds.cache.get(config.guild);
  	const member = guild.members.cache.get(req.user.id);
	if (!member) return res.redirect(config.invite);
	if (!db.has("uptimelinks_" + req.user.id)) return res.redirect("dashboard");
	const links = db.fetch("uptime")
	if (!member.roles.cache.has(config.adminrole)) {
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		}
	}

	if (db.has("uptime")) {
		const guild = client.guilds.cache.get(config.guild);
		
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Veritabanı sıfırlandı!", errorpopup: null })
			} else {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Veritabanı sıfırlandı!", errorpopup: null })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Veritabanı sıfırlandı!", errorpopup: null })
			} else {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Veritabanı sıfırlandı!", errorpopup: null })
			}
		}
		await db.deleteAll();
		await db.push("uptime", "please wait");
		await db.unpush("uptime", "please wait");

		const logembed = new EmbedBuilder()
			.setTitle("Veritabanı Sıfırlandı")
			.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` veritabanını sıfırladı!`)
			.setTimestamp()
			.setColor(Colors.Red);
		const logchannel = guild.channels.cache.get(config.logchannel);
		logchannel.send({ embeds: [logembed] });
	} else {
		return res.redirect("dashboard")
	}
});

app.get("/deletealllinks", async (req, res) => {
	const datenow = { date: Date.now() };
	if (!req.user) return res.redirect("giris")
	const guild = client.guilds.cache.get(config.guild);
  	const member = guild.members.cache.get(req.user.id);
	if (!member) return res.redirect(config.invite);
	if (!db.has("uptimelinks_" + req.user.id)) return res.redirect("dashboard");
	const links = db.fetch("uptime")
	if (!member.roles.cache.has(config.adminrole)) {
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu sayfayı görüntüleme yetkin yok." })
			}
		}
	}

	if (db.has("uptime")) {
		const guild = client.guilds.cache.get(config.guild);

		await links.forEach(async (link) => {
			await db.unpush("uptime", link)
		})

		const logembed = new EmbedBuilder()
			.setTitle("Tüm Linkler Silindi")
			.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` tüm linkleri sildi!`)
			.addFields(
				{name: `Silen`, value: `${member.toString()}`, inline: true},
				{name: `Toplam Link Sayısı`, value:`${links.length}`, inline: true},
			)
			.setTimestamp()
			.setColor(Colors.Red);
		const logchannel = guild.channels.cache.get(config.logchannel);
		logchannel.send({ embeds: [logembed] });
		
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Tüm linkler silindi!", errorpopup: null })
			} else {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Tüm linkler silindi!", errorpopup: null })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Tüm linkler silindi!", errorpopup: null })
			} else {
				res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Tüm linkler silindi!", errorpopup: null })
			}
		}

	} else {
		return res.redirect("dashboard")
	}
});

const listener = app.listen(port, "0.0.0.0", () => {
	console.log(`Site ${listener.address().port} portunda hazır!`);
});

client.login("MTEzMDU0NzEzNTk4OTk2MDc2NA.Gb0nPF.vjqgmu0s7uRCQgeJdJdCoNWRI4SzgO2bp8MUHI");

const path = require("path")
const fs = require("fs")

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

const axios = require("axios");

app.get("/add/:link", async (req, res) => {
	if (!req.user) return res.redirect("/giris");
	const guild = client.guilds.cache.get(config.guild);
  	const member = guild.members.cache.get(req.user.id);
	if (!member) return res.redirect(config.invite);
	const link = "https://" + req.params.link;
	const alluptimelinks = await db.fetch("uptime")

	if (db.has("banned_" + req.user.id)) {
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			}
		}
	}

	if (db.has("uptimelinks_" + req.user.id)) {
		if (link.endsWith(".repl.co") || link.endsWith(".glitch.me")) {
			const totallinks = db.fetch("uptimelinks_" + req.user.id).length;
			const userlinks = db.fetch("uptimelinks_" + req.user.id)
			const normalmaxlink = config.maxlink;
			const premiummaxlink = config.premiummaxlink;
			if (totallinks < premiummaxlink && member.roles.cache.has(config.premiumrole) || member.roles.cache.has(config.adminrole)) {
				if (alluptimelinks.includes(link) || userlinks.includes(link)) {
					if (member.roles.cache.has(config.premiumrole)) {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						}
					} else {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						}
					}
				} else {
					try {
						await axios.get(link);
						await db.push("uptime", link)
						await db.push("uptimelinks_" + req.user.id, link)
						const datenow = { date: Date.now() };
						const logembed = new EmbedBuilder()
							.setTitle("Bir Link Eklendi")
							.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` uptime listesine bir proje ekledi!`)
							.addFields(
								{name: `Ekleyen`, value: `${member.toString()}`, inline: true},
								{name: `Toplam Link Sayısı`, value:`${totallinks}`, inline: true},
								{name: `Plan`, value:`Premium`, inline: true},
								{name: `Link`, value:`${link}`, inline: true},
							)
							.setTimestamp()
							.setColor(Colors.Green);
						const logchannel = guild.channels.cache.get(config.logchannel);
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						}
						return logchannel.send({ embeds: [logembed] });
					} catch (er) {
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						}
					}
				}
			} else {
				if (totallinks < normalmaxlink) {
					try {
						await axios.get(link);
						await db.push("uptime", link)
						await db.push("uptimelinks_" + req.user.id, link)
						const datenow = { date: Date.now() };
						const logembed = new EmbedBuilder()
							.setTitle("Bir Link Eklendi")
							.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` uptime listesine bir proje ekledi!`)
							.addFields(
								{name: `Ekleyen`, value: `${member.toString()}`, inline: true},
								{name: `Toplam Link Sayısı`, value:`${totallinks}`, inline: true},
								{name: `Plan`, value:`Ücretsiz`, inline: true},
								{name: `Link`, value:`${link}`, inline: true},
							)
							.setTimestamp()
							.setColor(Colors.Green);
						const logchannel = guild.channels.cache.get(config.logchannel);
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						}
						return logchannel.send({ embeds: [logembed] });
					} catch (er) {
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						}
					}
				} else {
					if (member.roles.cache.has(config.premiumrole)) {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Maksimum link limitine ulaşmışsın!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Maksimum link limitine ulaşmışsın!" })
						}
					} else {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Maksimum link limitine ulaşmışsın!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Maksimum link limitine ulaşmışsın!" })
						}
					}
				}
			}
		} else {
			if (member.roles.cache.has(config.premiumrole)) {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				} else {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				}
			} else {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				} else {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				}
			}
		}
	} else {
		if (link.endsWith(".repl.co") || link.endsWith(".glitch.me")) {
			if (!db.has("uptimelinks_" + req.user.id)) {
				let totallinks = 0;
				if (alluptimelinks.includes(link)) {
					if (member.roles.cache.has(config.premiumrole)) {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						} else {
							return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						}
					} else {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						} else {
							return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Link zaten uptime ediliyor!" })
						}
					}
				} else {
					try {
						await axios.get(link);
						await db.push("uptime", link)
						await db.push("uptimelinks_" + req.user.id, link)
						const datenow = { date: Date.now() };
						const logembed = new EmbedBuilder()
							.setTitle("Bir Link Eklendi")
							.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` uptime listesine bir proje ekledi!`)
							.addFields(
								{name: `Ekleyen`, value: `${member.toString()}`, inline: true},
								{name: `Toplam Link Sayısı`, value:`${totallinks}`, inline: true},
								{name: `Plan`, value:`Premium`, inline: true},
								{name: `Link`, value:`${link}`, inline: true},
							)
							.setTimestamp()
							.setColor(Colors.Green);
						const logchannel = guild.channels.cache.get(config.logchannel);
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							} else {
								res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Link uptime listene eklendi!", errorpopup: null })
							}
						}
						return logchannel.send({ embeds: [logembed] });
					} catch (er) {
						if (member.roles.cache.has(config.premiumrole)) {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						} else {
							if (member.roles.cache.has(config.adminrole)) {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							} else {
								return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Lütfen geçerli bir link girin!" })
							}
						}
					}
				}
			} else {
				return;
			}
		} else {
			if (member.roles.cache.has(config.premiumrole)) {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				} else {
					return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				}
			} else {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				} else {
					return res.render("dashboard", { totallinks: "0", username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Sadece Replit ve Glitch projeleri uptime edilebilir!" })
				}
			}
		}
	}
})

app.get("/delete/:link", async (req, res) => {
	if (!req.user) return res.redirect("/giris");
	const guild = client.guilds.cache.get(config.guild);
  	const member = guild.members.cache.get(req.user.id);
	if (!member) return res.redirect(config.invite);
	const link = "https://" + req.params.link;
	const alluptimelinks = await db.fetch("uptime")

	if (db.has("banned_" + req.user.id)) {
		if (member.roles.cache.has(config.premiumrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			}
		} else {
			if (member.roles.cache.has(config.adminrole)) {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			} else {
				return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Görünüşe göre sistemden yasaklanmışsın. Link ekleyemezsin." })
			}
		}
	}

	if (db.has("uptimelinks_" + req.user.id)) {
		const memberlinks = await db.fetch("uptimelinks_" + req.user.id)
		if (alluptimelinks.includes(link) && memberlinks.includes(link) || member.roles.cache.has(config.adminrole)) {
			if (member.roles.cache.has(config.adminrole)) {
				if (!alluptimelinks.includes(link)) {
					if (member.roles.cache.has(config.premiumrole)) {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
						}
					} else {
						if (member.roles.cache.has(config.adminrole)) {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
						} else {
							return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
						}
					}
				}
			}


			const datenow = { date: Date.now() };
			await db.unpush("uptime", link)
			await db.unpush("uptimelinks_" + req.user.id, link)
			const logembed = new EmbedBuilder()
				.setTitle("Bir Link Silindi")
				.setDescription(`${member.toString()} (${req.user.id}) kullanıcısı ` + `<t:${parseInt(datenow.date / 1000)}:R>` + ` bir link sildi.`)
				.addFields(
					{name: `Silen`, value: `${member.toString()}`, inline: true},
					{name: `Toplam Link Sayısı`, value:`${memberlinks.length}`, inline: true},
					{name: `Link`, value:`${link}`, inline: true},
				)
				.setTimestamp()
				.setColor(Colors.Red);
			const logchannel = guild.channels.cache.get(config.logchannel);
			logchannel.send({ embeds: [logembed] });
			if (member.roles.cache.has(config.premiumrole)) {
				if (member.roles.cache.has(config.adminrole)) {
					res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: "Link uptime listesinden silindi!", errorpopup: null })
				} else {
					res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: "Link uptime listesinden silindi!", errorpopup: null })
				}
			} else {
				if (member.roles.cache.has(config.adminrole)) {
					res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: "Link uptime listesinden silindi!", errorpopup: null })
				} else {
					res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: "Link uptime listesinden silindi!", errorpopup: null })
				}
			}
		} else {
			if (member.roles.cache.has(config.premiumrole)) {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Yetkili", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
				} else {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Premium", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
				}
			} else {
				if (member.roles.cache.has(config.adminrole)) {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Yetkili", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
				} else {
					return res.render("dashboard", { totallinks: db.fetch("uptimelinks_" + req.user.id).length, username: req.user.username, avatar: guild.members.cache.get(req.user.id).displayAvatarURL(), plan: "Ücretsiz", yetki: "Kullanıcı", succespopup: null, errorpopup: "Bu link uptime listende bulunamadı!" })
				}
			}
		}
	} else { 
		return res.redirect("dashboard") 
	}
})

app.use((req, res, next) => {
    res.status(404).render("index")
})