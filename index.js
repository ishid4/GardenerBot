// TODOS
// Fix the volume. It's not working.
// DM Help menu
// Faster embedmusic. Nearly fixed
// Maybe, playlist will rise again?


// Requirements
//const opus = require('opusscript'); // nodeopus is better
//const ffmepg = require('ffmpeg-binaries');

const fs = require('fs');
const async = require('async');

const guilds_dir = './guilds.json';
const configs = require('./config.json');
const lang = JSON.parse(fs.readFileSync('./language.json'));
var defaultLang = "en";

// Discord framework
const Discord = require('discord.js');

// Youtube Token
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(configs.youtubeToken);

// Youtube downloader framework
const YTDL = require('ytdl-core-discord');

// Role configs
const roles = JSON.parse(fs.readFileSync('./roles.json'));
const guilds = JSON.parse(fs.readFileSync('./guilds.json'));

// Options
const ytdlOptions = {
  filter: "audioonly",
  quality: "highestaudio" // quality: "lowest"
};
//Server html kodları
var express = require('express');
var app = express();
app.set('port', (process.env.PORT || 3000));
app.use(express.static(__dirname + '/web/'));
app.get('/', function(req, res) {});
app.listen(app.get('port'), function() {
  console.log('Mounted ' + app.get('port'));
});

// Lyrics codes
const l = require("lyric-get");
const getArtistTitle = require('get-artist-title');

var bot = new Discord.Client({
  autoReconnect: true,
  max_message_cache: 0
});

var servers = {};

function videoPush3(vUrl) {
  var guildid = "422091347198214144";
  var kanal = "579027412780711966";

  if (!servers[guildid])
    servers[guildid] = {
      queue: [],
      whoputdis: [],
      videolength: [],
      videotitle: [],
      channel: [],
      lastmusicembed: []
    };
  var server = servers[guildid];

  youtube.getVideo(vUrl)
    .then(video => {
      const textChannel = bot.channels.get("519468740325408789"); // TESTING PURPOSE

      if (!server.queue[0]) {
        let addedqueue = new Discord.RichEmbed()
          .setDescription("**[" + video.title + "](" + vUrl + ")** started firstly.")
          .setColor(16098851)
        textChannel.send(addedqueue);
      } else if (server.queue[0]) {
        let addedqueue = new Discord.RichEmbed()
          .setDescription("**[" + video.title + "](" + vUrl + ")** has been added to the queue.")
          .setColor(16098851)
        textChannel.channel.send(addedqueue);
      }

      server.queue.push(vUrl);
      server.channel.push(kanal);
      server.whoputdis.push("Web_user");
      server.videotitle.push(video.title);

      const channel = bot.channels.get(kanal);
      if (!channel.guild.voiceConnection)
        channel.join().then(function(connection) {
          play(connection);
        }).catch(console.error);

    }).catch(console.error);
}

app.post('/', function(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(body);
      var post = body.split("=");
      if (post[0] == "link") {
        var vUrl = post[1] + "=" + post[2];
        videoPush3(vUrl);
        //play_web(post[1] + "=" + post[2]);
        //play_web(vUrl);
        res.end('Added queue.');
      }
    });
  }
});

// Playing now music
async function embedmusic(info, duration, who, message, server) {
  var embedmusic = new Discord.RichEmbed()
    .setAuthor("Playing Now", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
    .setColor(16098851)
    .setFooter("Click ⏭ to Skip")
    .setImage(info.maxRes.url)
    .setThumbnail("https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
    .setTimestamp()
    .addField("Title", "**[" + info.title + "](" + info.url + ")**")
    .addField("Duration", duration, true)
    .addField("Who Put Dis?", who, true);

  const textChannel = bot.channels.get("519468740325408789"); // TESTING PURPOSE

  let embedmain = await textChannel.send(embedmusic);
  server.lastmusicembed = embedmain;
  embedmain.react('⏭');

  const filter = (reaction) => reaction.emoji.name === '⏭';

  let r = await embedmain.createReactionCollector(filter, {
    maxUsers: 10,
    time: 700000
  });
  // emoji collecting
  r.on('collect', (reaction, reactionCollector, user) => {

    if (bot.user.id == reaction.users.last().id)
      return;

    var channel_users = message.guild.me.voiceChannel.members.size - 1;

    var votes = reaction.users.size - 1;

    var votes_need = Math.ceil(channel_users * 2 / 10) - votes;

    if (votes >= votes_need) {
      if (server.dispatcher)
        server.dispatcher.end();
    } else {
      async function vote_info() {
        let inf = await message.channel.send("<@" + reaction.users.last().id + "> wants to skip. **" + votes_need + " votes** need to skip.");
        await inf.delete(10000);
      }
      vote_info();
    }
  });
} // embedMusic

async function play(connection, message) {
  var server = servers["422091347198214144"];
  /*
  var streamOptions = {
    volume: guilds[message.guild.id].volume
  };
  */

  youtube.getVideo(server.queue[0])
    .then(video => {
      if (video.durationSeconds < 1) {
        var videoDuration = "Live";
      } else {
        var videoDuration = Math.floor(video.durationSeconds / 60) + " mins " + Math.floor(video.durationSeconds % 60) + " secs";
      }
      embedmusic(video, videoDuration, server.whoputdis[0], message, server); // run function & pass required information
    }).catch(console.error);

  server.dispatcher = connection.playOpusStream(await YTDL(server.queue[0], ytdlOptions));
  //server.dispatcher = connection.playOpusStream(await YTDL(server.queue[0], ytdlOptions), streamOptions);

  server.dispatcher.on("end", function() {
    if (server.lastmusicembed) {
      server.lastmusicembed.delete();
      server.lastmusicembed = [];
    }
    server.queue.shift();
    server.whoputdis.shift();
    server.videotitle.shift();
    server.videolength.shift();

    if (server.queue[0]) {
      play(connection, message);
    } else {
      server.channel = [];
      connection.disconnect();
    }
  });
}

/*
async function play_web(connection) {

  var server = servers[422091347198214144];
  var streamOptions = {
    volume: 100
  };

  youtube.getVideo(server.queue[0])
    .then(video => {
      var videoDuration = Math.floor(video.durationSeconds / 60) + " mins " + Math.floor(video.durationSeconds % 60) + " secs";
      embedmusic(video, videoDuration, "Web_user", message, server); // run function & pass required information
    }).catch(console.error);

  server.dispatcher = connection.playOpusStream(await YTDL(server.queue[0], ytdlOptions), streamOptions);
  server.dispatcher.on("end", function() {
    if (server.lastmusicembed) {
      server.lastmusicembed.delete();
      server.lastmusicembed = [];
    }
    server.queue.shift();
    server.whoputdis.shift();
    server.videotitle.shift();
    server.videolength.shift();

    if (server.queue[0]) {
      play_web(connection);
    } else {
      server.channel = [];
      connection.disconnect();
    }
  });
}
*/

bot.on('uncaughtException', (err) => {
  console.error(err);
});

bot.on('ready', function() {
  console.log("And Loaded " + bot.guilds.size + " servers");
  bot.user.setActivity("help", {
    type: "WATCHING"
  });
});

bot.on('message', message => {
  if (message.author.equals(bot.user))
    return;

  if (message.channel.type == 'dm') {
    var prefix = "";
  } else { // Channel messages
    if (!servers[message.guild.id])
      servers[message.guild.id] = {
        queue: [],
        whoputdis: [],
        videolength: [],
        videotitle: [],
        channel: [],
        lastmusicembed: []
      };
    var server = servers[message.guild.id];

    if (!guilds[message.guild.id]) {
      guilds[message.guild.id] = {
        name: message.guild.name,
        owner: message.guild.owner.user.id,
        prefix: "!",
        volume: "1",
        music_channel_id: "",
        music_channel_name: ""
      };
      let guildUpdate = JSON.stringify(guilds, null, 2);
      fs.writeFileSync(guilds_dir, guildUpdate);
    }

    var prefix = guilds[message.guild.id].prefix;
    var music_channel_id = guilds[message.guild.id].music_channel_id;
    var music_channel_id_fix = "<#" + music_channel_id + ">";
    var music_channel_name = guilds[message.guild.id].music_channel_name;

    if (server.queue[0])
      if (message.channel.id == server.channel[0])
        message.delete();

    if (message.isMentioned(bot.user))
      message.channel.send("Current Prefix: `" + prefix + "`\nCurrent Music Channel: " + "<#" + music_channel_id_fix + ">" + "\nIf you need any help, Just `" + prefix + "help`");

    // After prefix
    if (!message.content.startsWith(prefix))
      return;

    if (!music_channel_id)
      music_channel_id_fix = "`all`";

    var args = message.content.substring(prefix.length).split(" ");
    var argss = message.content.substring(prefix.length).split("?v=");
    var videoname = message.content.substring(prefix.length).split("play");

    switch (args[0].toLowerCase()) {
      case "play":
        if (!args[1])
          return message.reply("Where is the **Thing** you want to play?");

        if (!message.member.voiceChannel)
          return message.reply("You must be in a voice channel");

        if (server.queue[0]) {
          if (message.channel.id != server.channel[0])
            return message.reply("You must be in the same Text Channel with Bot.");
          if (message.member.voiceChannel.id != message.guild.me.voiceChannel.id)
            return message.reply("You must be in the same Voice Channel with Bot.");
        } else {
          message.delete();
        }

        if (music_channel_id) {
          if (music_channel_id != message.channel.id) {
            message.reply("You must be in the <#" + music_channel_id + ">");
            message.delete();
            return;
          }
        }

        //var pattern = new RegExp("(https*:\/\/)*(www.){0,1}youtube.com\/(.*)");
        //var pattern2 = new RegExp("(https*:\/\/)*(www.){0,1}youtu.be\/(.*)");
        var pattern = new RegExp("^(http(s)??\:\/\/)?(www\.)?((youtube\.com\/watch\?v=)|(youtu.be\/))([a-zA-Z0-9\-_])+$");

        if (!pattern.test(args[1])) {
          youtube.searchVideos(videoname, 1)
            .then(results => {
              if (!results[0])
                return message.reply("We couldn't find the actual video.");

              var vUrl = results[0].url;
              videoPush(vUrl);
            }).catch(console.log);
        } else {
          var vUrl = args[1];
          videoPush(vUrl);
        }

        function videoPush(vUrl) {
          youtube.getVideo(vUrl)
            .then(video => {
              if (video.durationSeconds < 1)
                return message.reply("Live Videos are not allowed.");

              if (server.queue.indexOf(vUrl) >= 0)
                return message.reply('Already in the queue. ');

              if (!server.queue[0]) {
                const addedqueue = new Discord.RichEmbed()
                  .setDescription("**[" + video.title + "](" + vUrl + ")** started firstly.")
                  .setColor(16098851)
                message.channel.send(addedqueue);
              } else if (server.queue[0]) {
                const addedqueue = new Discord.RichEmbed()
                  .setDescription("**[" + video.title + "](" + vUrl + ")** has been added to the queue.")
                  .setColor(16098851)
                message.channel.send(addedqueue);
              }

              var duration = Math.floor(video.durationSeconds / 60) + " mins " + Math.floor(video.durationSeconds % 60) + " secs";

              server.queue.push(vUrl);
              server.channel.push(message.channel.id);
              server.videolength.push(duration);
              server.whoputdis.push(message.author.username);
              server.videotitle.push(video.title);

              if (!message.guild.voiceConnection)
                message.member.voiceChannel.join().then(function(connection) {
                  play(connection, message);
                }).catch(console.error);
            }).catch(console.error);
        }
        break;

      case "skip":
        if (!message.member.hasPermission("MANAGE_GUILD"))
          return message.author.send("Insufficient permission.");

        if (message.guild.voiceConnection) {
          if (message.guild.me.voiceChannel)
            server.dispatcher.end();
        }
        break;

      case "volume":
        if (!message.member.hasPermission("MANAGE_GUILD"))
          return message.author.send("Insufficient permission.");

        async function settingvolume() {
          const embedvolume = new Discord.RichEmbed()
            .setDescription(":speaker: **Volume:** " + guilds[message.guild.id].volume * 100 + "%")
            .setColor(16098851)
          let volumeset = await message.channel.send(embedvolume);
          volumeset.delete(30000);
        }

        if (!args[1]) {
          settingvolume();
        } else {
          if (args[1] <= 100) {
            guilds[message.guild.id].volume = Math.max(args[1] / 100);
            let settingMusicVolume = JSON.stringify(guilds, null, 2);
            fs.writeFileSync(guilds_dir, settingMusicVolume);
            server.dispatcher.setVolume(guilds[message.guild.id].volume);
            settingvolume();
          } else if (args[1] > 100) {
            server.dispatcher.setVolume(args[1] / 100);
            setTimeout(function() {
              server.dispatcher.setVolume(guilds[message.guild.id].volume);
            }, 6500);
            message.channel.send(`:speaker: vOlUmE: ${Math.round(server.dispatcher.volume*100)}%`);
          }
        }
        break;

      case "stop":
        if (!message.member.hasPermission("MANAGE_GUILD"))
          return message.author.send("Insufficient permission.");

        if (message.guild.voiceConnection && message.guild.me.voiceChannel) {
          server.queue = [];
          server.videotitle = [];
          server.whoputdis = [];
          server.channel = [];
          server.dispatcher.end();
        }
        break;

      case "pause":
        if (message.guild.me.voiceChannel)
          server.dispatcher.pause();
        message.reply("Music paused.");
        break;

      case "resume":
        if (message.guild.me.voiceChannel)
          server.dispatcher.resume();
        break;

      case "lyrics":
        if (!server.queue[0])
          return message.reply("Nothing is playing right now.");

        let [artist, title] = getArtistTitle(server.videotitle[0], {
          defaultArtist: "null"
        });

        l.get(artist, title, function(err, res) {
          if (err)
            return message.author.send("Debug: " + artist + " | " + title + ". We couldn't find the lyrics of that song...");

          const song_lyrics = new Discord.RichEmbed()
            .setColor(16098851)
            .setTitle("**Lyrics:** " + server.videotitle[0])
            .setDescription(res.substring(0, 2048))
          message.author.send(song_lyrics);
          if (res.length > 2048) {
            const song_lyrics2 = new Discord.RichEmbed()
              .setColor(16098851)
              .setDescription(res.substring(2048, 4096))
            message.author.send(song_lyrics2);
          }
        });
        break;

      case "shuffle":
        if (!server.queue[0])
          return message.reply("Nothing is playing.");
        if (server.queue.length < 3)
          return message.channel.send("I can't shuffle less than 3 songs.");

        var originalQueue = server.queue;

        function shuffle(a, b, c) {
          var j, x, i;
          for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            if (j == 0)
              return;
            x = a[i];
            a[i] = a[j];
            a[j] = x;

            x = b[i];
            b[i] = b[j];
            b[j] = x;

            x = c[i];
            c[i] = c[j];
            c[j] = x;
          }
        }
        shuffle(server.queue, server.videotitle, server.whoputdis);
        if (server.queue == originalQueue)
          shuffle(server.queue, server.videotitle, server.whoputdis);
        message.channel.send('Shuffled queue.');
        break;

      case "queue":
        if (!server.queue.length)
          return message.reply("Add some music nibba");
        if (server.queue[1]) {
          var tracksInfos = "";
          for (var i = 1; i < server.queue.length && i <= 7; i++) {
            tracksInfos += i + ". [" + server.videotitle[i] + "](" + server.queue[i] + ") (by " + server.whoputdis[i] + ")\n";
          }
          if (server.queue.length > 8)
            tracksInfos += " **- " + (server.queue.length - 8) + " more in queue -**";

          if (tracksInfos.length > 1024)
            return message.reply("Too many characters...");
          const embedqueue = new Discord.RichEmbed()
            .setAuthor("Queue List", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
            .addField("Playing Now", "[" + server.videotitle[0].substring(0, 40) + ".." + "](" + server.queue[0] + ") (by " + server.whoputdis[0] + ")")
            .setColor(16098851)
            .addField("Queue", tracksInfos)
          message.channel.send(embedqueue);
        } else {
          const embedqueue = new Discord.RichEmbed()
            .setAuthor("Queue List", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
            .addField("Playing Now", "[" + server.videotitle[0].substring(0, 40) + ".." + "](" + server.queue[0] + ") (by " + server.whoputdis[0] + ")")
            .setColor(16098851)
          message.channel.send(embedqueue);
        }
        break;

      case "feedback":
        var feedback = message.content.substring(prefix.length + 8);
        if (!feedback[1] || feedback.length < 10)
          return message.author.send("Please, write your feedback carefully.");

        message.delete();
        message.channel.createInvite()
          .then(invite => za(invite.code))
          .catch(console.error);

        function za(invite) {
          const feedback_embed = new Discord.RichEmbed()
            .setColor(16312092)
            .setTitle("Feedback")
            .setDescription(feedback)
            .setFooter("Sent by " + message.author.username + ":" + message.author.id + " -> " + invite)
          bot.users.get("139144182794027009").send(feedback_embed);
          message.author.send("Thanks for your Feedback! Developer will read these.");
        }
        break;

      case "settings":
        if (!args[1])
          return;

        switch (args[1].toLowerCase()) {
          case "setprefix":
            if (!message.member.hasPermission("MANAGE_GUILD"))
              return message.author.send("Insufficient permission.");
            if (!args[2] || args[2].length > 3 || args[2].length <= 0) {
              return message.channel.send("Prefix should be between 1-3 characters.");
            } else {
              guilds[message.guild.id].prefix = args[2];
              message.channel.send("Prefix changed to `" + args[2] + "`");
              bot.users.get(message.guild.owner.user.id).send("Prefix changed to `" + args[2] + "` in **" + message.guild.name + "**");
              let settingPrefix = JSON.stringify(guilds, null, 2);
              fs.writeFileSync(guilds_dir, settingPrefix);
            }
            break;

          case "setchannel":
            if (!message.member.hasPermission("MANAGE_GUILD"))
              return message.author.send("Insufficient permission.");
            if (message.channel.id == guilds[message.guild.id].music_channel_id) {
              guilds[message.guild.id].music_channel_id = "";
              guilds[message.guild.id].music_channel_name = "";
              message.channel.send("Music Channel changed to `all`");
              let settingMusicChannel = JSON.stringify(guilds, null, 2);
              fs.writeFileSync(guilds_dir, settingMusicChannel);
              return;
            }
            guilds[message.guild.id].music_channel_id = message.channel.id;
            guilds[message.guild.id].music_channel_name = message.channel.name;
            message.channel.send("Music Channel changed to `" + message.channel.name + "`");
            bot.users.get(message.guild.owner.user.id).send("Music Channel changed to `" + message.channel.name + "` in **" + message.guild.name + "**");
            let settingMusicChannel = JSON.stringify(guilds, null, 2);
            fs.writeFileSync(guilds_dir, settingMusicChannel);
            break;
          default:
            message.author.send("Try help!");
        }
        break;

      case "ping":
        var sent = new Date().getTime();
        message.channel.send("Bot ping: " + Math.trunc(bot.ping) + "ms.").then(message => {
          message.edit(`${message.content} Ms: ${new Date().getTime() - sent}.`);
        });
        break;

      case "try":
        function videoPush2(vUrl) {
          var guildid = "422091347198214144";
          var kanal = "579027412780711966";

          youtube.getVideo(vUrl)
            .then(video => {
              if (!server.queue[0]) {
                const addedqueue = new Discord.RichEmbed()
                  .setDescription("**[" + video.title + "](" + vUrl + ")** started firstly.")
                  .setColor(16098851)
                message.channel.send(addedqueue);
              } else if (server.queue[0]) {
                const addedqueue = new Discord.RichEmbed()
                  .setDescription("**[" + video.title + "](" + vUrl + ")** has been added to the queue.")
                  .setColor(16098851)
                message.channel.send(addedqueue);
              }

              server.queue.push(vUrl);
              server.channel.push(kanal);
              server.whoputdis.push("Web_user");
              server.videotitle.push(video.title);

              const channel = bot.channels.get(kanal);
              if (!channel.guild.voiceConnection)
                channel.join().then(function(connection) {
                  play(connection, message);
                }).catch(console.error);
            }).catch(console.error);
        }

        videoPush2("https://www.youtube.com/watch?v=wd1vXQJ0XVY");

        break;

      default:
        message.reply("Command doesn't exist.");
    }
  } // Channel messages END

});

bot.login(configs.token);
