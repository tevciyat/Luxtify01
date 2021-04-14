const { Client, Util, MessageEmbed } = require("discord.js");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
require("dotenv").config();
require("./server.js");

const bot = new Client({
    disableMentions: "all"
});

const PREFIX = process.env.PREFIX;
const youtube = new YouTube(process.env.YTAPI_KEY);
const queue = new Map();

bot.on("warn", console.warn);
bot.on("error", console.error);
bot.on("ready", () => console.log(`[READY] ${bot.user.tag} başarıyla başlatıldı!`));
bot.on("shardDisconnect", (event, id) => console.log(`[SHARD] Shard ${id} bağlantı kesildi (${event.code}) ${event}, yeniden bağlanmaya çalışıyorum...`));
bot.on("shardReconnecting", (id) => console.log(`[SHARD] Parça ${id} yeniden bağlanma...`));

// prevent force disconnect affecting to guild queue
bot.on("voiceStateUpdate", (mold, mnew) => {
	if( !mold.channelID) return;
	if( !mnew.channelID && bot.user.id == mold.id ) {
		 const serverQueue = queue.get(mold.guild.id);
		 if(serverQueue)  queue.delete(mold.guild.id);
	} ;
})

bot.on("message", async (message) => { // eslint-disable-line
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.split(" ");
    const searchString = args.slice(1).join(" ");
    const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
    const serverQueue = queue.get(message.guild.id);

    let command = message.content.toLowerCase().split(" ")[0];
    command = command.slice(PREFIX.length);

    if (command === "yardım" || command === "Yardım") {
      const Luxtify = new MessageEmbed()
      .setAuthor('Luxtify Komut Listesi')
      .setColor('#240506')
      .setDescription(`
      > \`.play\` ・ Oynat  [İsim/Link] 
      > \`.fs\` ・ Durdur  [İsim/Link] 
      > \`.volume\` ・ Ses  [1/100]
      > \`.search\` ・ Ara  [İsim/Link] 
      > \`.skip\` ・ Bitir
      > \`.pause\` ・ Duraklat
      > \`.resume\` ・ Devam Ettir
      > \`.nowplaying\` ・ Şimdi Çalıyor
      > \`.queue\` ・ Sıradakiler
      `)
      message.channel.send(Luxtify)
  
   } 
    if (command === "play" || command === "p") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Müzik çalabilmem için sanki ses kanalında olman gerekiyor ama yani!"
            }
        });
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: "Devam etmek için ** `BAĞLANTI` ** iznini vermen lazım!"
                }
            });
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: "Devam etmek için ** `KONUŞ` ** iznini vermen lazım!"
                }
            });
        }
        if (!url || !searchString) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Bir şeyler çalabilmem için lütfen link / başlık girin"
            }
        });
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: `✅  **|**  Oynatma Listesi ・ **\`${playlist.title}\`** Sıraya Ekledim`
                }
            });
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    var video = await youtube.getVideoByID(videos[0].id);
                    if (!video) return message.channel.send({
                        embed: {
                color: "#240506",
                            description: "🆘  **|**  Bir şey bulamadım maalesef.Lütfen daha detaylı girer misiniz?"
                        }
                    });
                } catch (err) {
                    console.error(err);
                    return message.channel.send({
                        embed: {
                color: "#240506",
                            description: "🆘  **|**  Bir şey bulamadım maalesef.Lütfen daha detaylı girer misiniz?"
                        }
                    });
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
    if (command === "search" || command === "sc") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Bir şeyler çalmam için ses kanalında olman gerek değil mi sence de?!"
            }
        });
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: "Devam etmem için ** `BAĞLAN`** iznini verir misin?"
                }
            });
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: "Devam etmem için ** `KONUŞ` ** iznini verir misin?"
                }
            });
        }
        if (!url || !searchString) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Bir şey çalabilmem için ・ Lütfen Link / Başlık Girin!"
            }
        });
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({
                embed: {
                color: "#240506",
                    description: `✅  **|**  Oynatma listesi ・ **\`${playlist.title}\`** Sıraya Eklendi`
                }
            });
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    let embedPlay = new MessageEmbed()
                .setcolor ("#240506")
                        .setAuthor("Arama Sonuçları", message.author.displayAvatarURL())
                        .setDescription(`${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}`)
                        .setFooter("Aşağıdaki 10 sonuçtan birini seçmelisin, yoksa bu yerleştirme 15 saniye içinde otomatik olarak kaybolacak");
                    // eslint-disable-next-line max-depth
                    message.channel.send(embedPlay).then(m => m.delete({
                        timeout: 15000
                    }))
                    try {
                        var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                            max: 1,
                            time: 15000,
                            errors: ["time"]
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send({
                            embed: {
                color: "#240506",
                                description: "Müzik seçmen için 15 saniyen vardı ve sona erdi, isteğin iptal edildi."
                            }
                        });
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send({
                        embed: {
                color: "#240506",
                            description: "🆘  **|**  Kanka daha detaylı yazsana bir şey bulamadım"
                        }
                    });
                }
            }
            response.delete();
            return handleVideo(video, message, voiceChannel);
        }

    } else if (command === "fs") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Kusura bakma ama bir müziği geçmem için ses kanalında olman gerek!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Atlanacak bir şey kalmamış "
            }
        });
        serverQueue.connection.dispatcher.end("[runCmd] Atla Komutu Kullanıldı");
        return message.channel.send({
            embed: {
                color: "#240506",
                description: "⏭️  **|**  Şarkıyı atladım "
            }
        });

    } else if (command === "stop") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Kusura bakma ama müzik çalmak için bir ses kanalında olmanız gerek!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Ortada durduracak hiç birşey kalmamış"
            }
        });
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end("[runCmd] Durdurma Komutu Kullanıldı");
        return message.channel.send({
            embed: {
                color: "#240506",
                description: "⏹️  **|**  Listeyi siliyorum ve kanaldan çıkıyorum ..."
            }
        });

    } else if (command === "volume" || command === "vol") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Kusura bakma ama ses seviyesini ayarlamam için ses kanalında olman gerek!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Hiç birşey çalmıyorum ahah"
            }
        });
        if (!args[1]) return message.channel.send({
            embed: {
                color: "#240506",
                description: `Mevcut Ses ・ **\`${serverQueue.volume}%\`**`
            }
        });
        if (isNaN(args[1]) || args[1] > 100) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Sesi ** \ `1 \` ** - ** \ `100 \` ** arası ayarlayabilirim"
            }
        });
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolume(args[1] / 100);
        return message.channel.send({
            embed: {
                color: "#240506",
                description: `Ses Başarıyla Ayarlandı ・ **\`${args[1]}%\`**`
            }
        });

    } else if (command === "nowplaying" || command === "np") {
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Hiç birşey çalmıyor şu an"
            }
        });
        return message.channel.send({
            embed: {
                color: "#240506",
                description: `🎶  **|**  Müzik Şimdi ・ **\`${serverQueue.songs[0].title}\`**`
            }
        });

    } else if (command === "queue" || command === "q") {

        let songsss = serverQueue.songs.slice(1)
        
        let number = songsss.map(
            (x, i) => `${i + 1} - ${x.title}`
        );
        number = chunk(number, 5);

        let index = 0;
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#240506",
                description: "Hiçbir şey çalmıyor şu an"
            }
        });
        let embedQueue = new MessageEmbed()
            .setColor("#240506")
            .setAuthor("Şarkı Sırası", message.author.displayAvatarURL())
            .setDescription(number[index].join("\n"))
            .setFooter(`• Now Playing: ${serverQueue.songs[0].title} | Page ${index + 1} of ${number.length}`);
        const m = await message.channel.send(embedQueue);

        if (number.length !== 1) {
            await m.react("⬅");
            await m.react("🛑");
            await m.react("➡");
            async function awaitReaction() {
                const filter = (rect, usr) => ["⬅", "🛑", "➡"].includes(rect.emoji.name) &&
                    usr.id === message.author.id;
                const response = await m.awaitReactions(filter, {
                    max: 1,
                    time: 30000
                });
                if (!response.size) {
                    return undefined;
                }
                const emoji = response.first().emoji.name;
                if (emoji === "⬅") index--;
                if (emoji === "🛑") m.delete();
                if (emoji === "➡") index++;

                if (emoji !== "🛑") {
                    index = ((index % number.length) + number.length) % number.length;
                    embedQueue.setDescription(number[index].join("\n"));
                    embedQueue.setFooter(`Page ${index + 1} of ${number.length}`);
                    await m.edit(embedQueue);
                    return awaitReaction();
                }
            }
            return awaitReaction();
        }

    } else if (command === "pause") {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send({
                embed: {
                    color: "#240506",
                    description: "⏸  **|**  Müziği duraklattım"
                }
            });
        }
        return message.channel.send({
            embed: {
                color: "#240506",
                description: "Hiçbir Şey Oynamıyor"
            }
        });

    } else if (command === "resume") {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send({
                embed: {
                    color: "#240506",
                    description: "▶  **|**  Müziği devam ettirdim"
                }
            });
        }
        return message.channel.send({
            embed: {
                color: "RED",
                description: "Hiçbir şey oynamıyor"
            }
        });
    } else if (command === "loop") {
        if (serverQueue) {
            serverQueue.loop = !serverQueue.loop;
            return message.channel.send({
                embed: {
                    color: "#240506",
                    description: `🔁  **|**  Döngü ・ **\`${serverQueue.loop === true ? "etkinleştirildi" : "engelli"}\`**`
                }
            });
        };
        return message.channel.send({
            embed: {
                color: "#240506",
                description: "Hiçbir şey oynamıyor"
            }
        });
    }
});

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 100,
            playing: true,
            loop: false
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`[ERROR] Ses Kanalına Katılamadım Çünkü ・ ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send({
                embed: {
                    color: "#240506",
                    description: `Ses Kanalına Katılamadım Çünkü ・ **\`${error}\`**`
                }
            });
        }
    } else {
        serverQueue.songs.push(song);
        if (playlist) return;
        else return message.channel.send({
            embed: {
                color: "#240506",
                description: `✅  **|**  **\`${song.title}\`** Sıraya Eklendi`
            }
        });
    }
    return;
}

function chunk(array, chunkSize) {
    const temp = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        temp.push(array.slice(i, i + chunkSize));
    }
    return temp;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        return queue.delete(guild.id);
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on("finish", () => {
            const shiffed = serverQueue.songs.shift();
            if (serverQueue.loop === true) {
                serverQueue.songs.push(shiffed);
            };
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(serverQueue.volume / 100);

    serverQueue.textChannel.send({
        embed: {
            color: "#240506",
            description: `🎶  **|**  Müzik ・ **${song.title}**`
        }
    });
}

bot.login(process.env.BOT_TOKEN);

process.on("unhandledRejection", (reason, promise) => {
    try {
        console.error("İşlenmemiş Reddetme ・ ", promise, "reason: ", reason.stack || reason);
    } catch {
        console.error(reason);
    }
});

process.on("uncaughtException", err => {
    console.error(`Caught exception: ${err}`);
    process.exit(1);
});
