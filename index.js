const Discord = require('discord.js');
const {
  token
} = require('./config.json');
const YTDL = require('ytdl-core');
const fs = require('fs');
const async = require('async');
const now = require('performance-now');
const playlist = JSON.parse(fs.readFileSync('./playlist.json'));
const playlist_dir = './playlist.json';
const roles = JSON.parse(fs.readFileSync('./roles.json'));
const guilds = JSON.parse(fs.readFileSync('./guilds.json'));
const guilds_dir = './guilds.json';

const ytdlOptions = {
  filter: "audioonly",
  quality: "lowest"
};

const YouTube = require('simple-youtube-api');
const youtube = new YouTube('AIzaSyBMW9D6z_8wOQKqxsCSiL7_DQJXr3Oi_zY');

const l = require("lyric-get");
const getArtistTitle = require('get-artist-title');

/*const http = require('http');
http.createServer(function(request, response)
{
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('Discord bot is active now \n');
}).listen(3000);*/

var lang_tr = {
  str1: "Merhaba.",
  str2: "Nasılsın?",
  str3: "İyiyim."
};

var lang_en = {
  str1: "Hello.",
  str2: "How are you?",
  str3: "Fine."
};



var bot = new Discord.Client({
  autoReconnect: true,
  max_message_cache: 0
});

var servers = {};

function generateHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

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

  let embedmain = await message.channel.send(embedmusic);
  server.lastmusicembed = embedmain;
  embedmain.react('⏭');

  const filter = (reaction) => reaction.emoji.name === '⏭';
  /*let r = await embedmain.awaitReactions(filter, { maxUsers: 10, max: 2});
  let yes = r.get("⏭").users.size;
  if (yes == 2) {
  if (server.dispatcher) server.dispatcher.end();
  }*/
  let r = await embedmain.createReactionCollector(filter, {
    maxUsers: 10,
    time: 700000
  });
  r.on('collect', (reaction, reactionCollector, user) => {
    if (bot.user.id == reaction.users.last().id)
      return;
    var channel_users = message.guild.me.voiceChannel.members.size - 1;
    var votes = reaction.users.size - 1;
    var votes_need = channel_users - votes;
    //console.log("votes :" + votes);
    //console.log("channel users : " + channel_users);

    if (channel_users >= 3) {
      if (votes == 3) {
        if (server.dispatcher)
          server.dispatcher.end();
      } else {
        async function vote_info() {
          let inf = await message.channel.send("<@" + reaction.users.last().id + "> wants to skip. **" + votes_need + " votes** need to skip.");
          await inf.delete(10000);
        }
        vote_info();
      }
    } else if (channel_users == 2) {
      if (votes == 2) {
        if (server.dispatcher)
          server.dispatcher.end();
      } else {
        async function vote_info() {
          let inf = await message.channel.send("<@" + reaction.users.last().id + "> wants to skip. **One more vote** need to skip.");
          await inf.delete(10000);
        }
        vote_info();
      }
    } else {
      if (votes == 1) {
        if (server.dispatcher)
          server.dispatcher.end();
        async function vote_info() {
          let inf = await message.channel.send("<@" + reaction.users.last().id + "> skipped the song.");
          //await inf.delete(10000);
        }
        vote_info();
      }
    }
    //console.log(reaction.users.last().username);
    //console.log(reaction.users.filter(u => u.id !== bot.user.id).map(u => u.username).join("\n"));
    //console.log(`Collected ${reaction.emoji.name}`);
  });

}

async function play(connection, message) {
  var server = servers[message.guild.id];
  var streamOptions = {
    volume: guilds[message.guild.id].volume
  };
  server.dispatcher = connection.playStream(YTDL(server.queue[0], ytdlOptions), streamOptions);
  youtube.getVideo(server.queue[0])
    .then(video => {
      if (video.durationSeconds < 1) {
        var videoDuration = "Live";
      } else {
        var videoDuration = Math.floor(video.durationSeconds / 60) + " mins " + video.durationSeconds % 60 + " secs";
      }
      embedmusic(video, videoDuration, server.whoputdis[0], message, server); // run function & pass required information
    })
    .catch(console.error);

  server.dispatcher.on("end", function() {
    if (server.lastmusicembed) {
      server.lastmusicembed.delete();
      server.lastmusicembed = [];
    }
    server.queue.shift();
    server.whoputdis.shift();
    server.videotitle.shift();
    server.videolengh.shift();

    if (server.queue[0]) {
      play(connection, message);
    } else {
      server.channel = [];
      connection.disconnect();
    }
  });
}

bot.on('uncaughtException', (err) => {
  console.error(err);
})
bot.on('ready', function() {
  console.log("Bot is up and running in " + bot.guilds.size + " servers");
  bot.user.setActivity("help", {
    type: "WATCHING"
  });
});

/*bot.on("guildMemberAdd", function(member) {
  member.guild.channels.find("name", "general").send(member.toString() + " What's up Boii");

  role = member.guild.roles.find("name", "BITCH");
  member.addRole(role).catch(console.error);

  member.guild.createRole({
  name: member.user.username,
  color: generateHex(),
  permissions: []
  }).then(function(role) {
  member.addRole(role);
  });

});*/

bot.on('message', message => {
  /*if (message.author.id == "142721934772273152") {
  message.delete(3000);
  message.channel.send("**göt veren erdem ignored**")
  return;
  }*/
  if (!message.author.equals(bot.user)) {
    if (message.channel.type != 'dm') {
      if (!guilds[message.guild.id]) {
        guilds[message.guild.id] = {
          name: message.guild.name,
          owner: message.guild.owner.user.id,
          prefix: "!",
          volume: "100",
          music_channel_id: "",
          music_channel_name: ""
        };
        let guildUpdate = JSON.stringify(guilds, null, 2);
        fs.writeFileSync(guilds_dir, guildUpdate);
      }
      //Prefix
      var prefix = guilds[message.guild.id].prefix;
      var music_channel_id = guilds[message.guild.id].music_channel_id;
      var music_channel_id_fix = "<#" + music_channel_id + ">";
      var music_channel_name = guilds[message.guild.id].music_channel_name;

      if (!music_channel_id)
        music_channel_id_fix = "`all`";

      if (message.isMentioned(bot.user)) {
        message.channel.send("Current Prefix: `" + prefix + "`\nCurrent Music Channel: " + music_channel_id_fix + "\nIf you need any help, Just type `" + prefix + "help`");
      }
      if (message.guild.me.voiceChannel) {
        if (!servers[message.guild.id])
          servers[message.guild.id] = {
            queue: [],
            whoputdis: [],
            videolengh: [],
            videotitle: [],
            playing: [],
            channel: [],
            lastmusicembed: []
          };
        var server = servers[message.guild.id];
        if (server.queue[0]) {
          if (message.channel.id == server.channel[0])
            message.delete();
        }
      }
    }
  }
  if (message.channel.type == 'dm') {
    var prefix = "";
  }
  if (message.author.equals(bot.user))
    return;

  if (!message.content.startsWith(prefix))
    return;

  var args = message.content.substring(prefix.length).split(" ");
  var argss = message.content.substring(prefix.length).split("?v=");
  var videoname = message.content.substring(prefix.length).split("play");
  var url = message.content.substring(prefix.length).split("playlistadd");

  //if(args[0].toLowerCase() != "help") message.delete(10000);

  switch (args[0].toLowerCase()) {
    case "maleren":
      message.channel.send("malerol");
      break;
    case "ping2":
      let start = now();
      message.channel.send("*Pinging...*").then(message => {
        let end = now();
        message.edit(`Pong! **${(end - start).toFixed(0)}ms**`);
      });
      break;
    case "ping":
      var sent = new Date().getTime();
      message.channel.send("Heartbeat **" + Math.trunc(bot.ping) + "ms.**").then(message => {
        message.edit(`${message.content} Pong! **${new Date().getTime() - sent} ms.**`);
      });
      break;
    case "try":
      console.log("Channel ID: " + message.channel.name);
      var txtchn;
      for (var i = 0; i < message.guild.channels.array().length; i++) {
        if (message.guild.channels.array()[i].type === "text")
          if (message.guild.channels.array()[i].name === "music")
            txtchn = message.guild.channels.array()[i].name;
      }
      console.log(txtchn);
      if (!txtchn) {
        message.guild.createChannel('music', 'text')
          .then()
          .catch(console.error);
      }
      break;
    case "meyve":
      var meyveler = [
        "elma",
        "armut",
        "maydanoz",
        "şeftali",
        "muz",
        "roka"
      ];
      var sebzeler = [
        "maydanoz",
        "roka",
        "marul",
      ];
      for (var i = 0; i < meyveler.length; i++) {
        if (sebzeler.includes(meyveler[i])) {
          meyveler.splice(i, 1);
        }
      }
      console.log(meyveler);
      break;
    case "channel":
      //message.channel.bulkDelete(1, true);
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");

      if (!message.member.voiceChannel)
        return message.reply("You must be in a voice channel");
      /*if (!message.guild.me.voiceChannel)
        return message.reply("Bot must be in a voice channel");*/
      console.log('my channel Text Channel id: ' + message.channel.id)
      console.log('my channel voiceChannel id: ' + message.member.voiceChannel.id);
      //console.log("bot's voiceChannel channel id: " + message.guild.me.voiceChannel.id);
      break;
    case "play":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!args[1])
        return message.reply("Where is the **Thing** you want to play?");
      if (!message.member.voiceChannel)
        return message.reply("You must be in a voice channel");
      if (!servers[message.guild.id]) {
        servers[message.guild.id] = {
          queue: [],
          whoputdis: [],
          videolengh: [],
          videotitle: [],
          playing: [],
          channel: [],
          lastmusicembed: []
        };
      }
      var server = servers[message.guild.id];

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

      var pattern = new RegExp("(https*:\/\/)*(www.){0,1}youtube.com\/(.*)");
      var pattern2 = new RegExp("(https*:\/\/)*(www.){0,1}youtu.be\/(.*)");

      if (pattern.test(args[1]) || pattern2.test(args[1])) {
        if (!argss[1].match(/^[a-zA-Z0-9-_]{11}$/))
          return message.reply("Corrupted URL.");

        youtube.getVideo(args[1])
          .then(video => {
            if (video.durationSeconds < 1)
              return message.reply("Live Videos are not allowed.");

            for (var i = 0; i < server.queue.length; i++) {
              if (server.queue[i] == args[1]) {
                message.reply('Already in the queue. ');
                return;
              }
            }
            server.queue.push(args[1]);
            server.channel.push(message.channel.id);
            server.whoputdis.push(message.author.username);
            server.videolengh.push(video.durationSeconds);
            server.videotitle.push(video.title);

            if (!server.queue[1]) {
              const addedqueue = new Discord.RichEmbed()
                .setDescription("**[" + video.title + "](" + args[1] + ")** started firstly.")
                .setColor(16098851)
              message.channel.send(addedqueue);
              //message.reply('The song: **' + video.title + "** started firstly.");
            }
            if (server.queue[1]) {
              const addedqueue = new Discord.RichEmbed()
                .setDescription("**[" + video.title + "](" + args[1] + ")** has been added to the queue.")
                .setColor(16098851)
              message.channel.send(addedqueue);
              //message.reply('The song: **' + video.title + "** has been added to the queue list.");
            }

            if (!message.guild.voiceConnection)
              message.member.voiceChannel.join().then(function(connection) {
                play(connection, message);
              }).catch(console.error);
          })
          .catch(console.error);
      } else {
        youtube.searchVideos(videoname, 1)
          .then(results => {
            if (!results[0])
              return message.reply("We couldn't find the actual video.");;
            youtube.getVideo(results[0].url)
              .then(video => {
                if (video.durationSeconds < 1)
                  return message.reply("Live Videos are not supported.");
                for (var i = 0; i < server.queue.length; i++) {
                  if (server.queue[i] == video.url) {
                    message.reply('Already in the queue. ');
                    return;
                  }
                }
                if (!server.queue[0]) {
                  const addedqueue = new Discord.RichEmbed()
                    .setDescription("**[" + video.title + "](" + video.url + ")** started firstly.")
                    .setColor(16098851)
                  message.channel.send(addedqueue);

                  //message.reply("The song: **" + video.title + "** started firstly.");
                }
                if (server.queue[0]) {
                  const addedqueue = new Discord.RichEmbed()
                    .setDescription("**[" + video.title + "](" + video.url + ")** has been added to the queue.")
                    .setColor(16098851)
                  message.channel.send(addedqueue);

                  //message.reply('The song: **' + video.title + "** has been added to the queue list.");
                }

                server.queue.push(video.url);
                server.channel.push(message.channel.id);
                server.whoputdis.push(message.author.username);
                server.videolengh.push(video.durationSeconds);
                server.videotitle.push(video.title);

                if (!message.guild.voiceConnection)
                  message.member.voiceChannel.join().then(function(connection) {
                    play(connection, message);
                  }).catch(console.error);
              }).catch(console.error);
          }).catch(console.log);
      }
      break;
    case "playlist":
      if (!args[1]) {
        var user_playlist = "";
        var u = 0;
        //var count = Object.keys(data).length;console.log(count);
        for (var k in playlist)
          if (playlist.hasOwnProperty(k)) {
            //console.log(k + " - " + playlist[k].server);
            if (playlist[k].author == message.author.id) {
              u = u + 1;
              user_playlist += k + "\n";
              //console.log(k + " - " + playlist[k].author);
            }
          }
        if (u == 0) {
          user_playlist += "Empty!";
        }
        //message.channel.send(`<@${message.author.id}>**'s Playlist List**\n`);
        const user_playlists = new Discord.RichEmbed()
          .setAuthor(`${message.author.username}` + "'s Playlists", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
          .setColor(16098851)
          .addField("Playlist Names", user_playlist)
        message.channel.send(user_playlists);
        return;
      }
      switch (args[1].toLowerCase()) {
        case "start":
          if (message.channel.type == 'dm')
            return message.reply("You can not use this in DM");

          if (!message.member.voiceChannel)
            return message.reply("You must be in a voice channel");

          if (music_channel_id) {
            if (music_channel_id != message.channel.id) {
              message.reply("You must be in the <#" + music_channel_id + ">");
              message.delete();
              return;
            }
          }

          if (args[2]) {
            if (!playlist[args[2]])
              return message.channel.send(":no_entry_sign: Playlist is not exist.");
          }
          if (!playlist[args[2]].songs.length)
            return message.channel.send("This Playlist is empty! Add some with `" + prefix + "playlist add " + args[2] + " <url>`");
          if (!servers[message.guild.id])
            servers[message.guild.id] = {
              queue: [],
              whoputdis: [],
              videolengh: [],
              videotitle: [],
              playing: [],
              channel: [],
              lastmusicembed: []
            };
          var server = servers[message.guild.id];
          if (server.queue[0]) {
            if (message.channel.id != server.channel[0])
              return message.reply("You must be in the same Text Channel with Bot.");
            if (message.member.voiceChannel.id != message.guild.me.voiceChannel.id)
              return message.reply("You must be in the same Voice Channel with Bot.");
          } else {
            message.delete();
          }

          let urlofsongs = [];
          let titleofsongs = [];
          var added_songs = 0;
          playlist[args[2]].songs.forEach((song, i) => {
            for (var i = 0; i < server.queue.length; i++) {
              if (server.queue[i] == song.url) {
                //message.reply('Already in the queue. ');
                return;
              }
            }
            added_songs = added_songs + 1;
            const addedqueue = new Discord.RichEmbed()
              .setDescription("**[" + song.title + "](" + song.url + ")** has been added to the queue.")
              .setColor(16098851)
            message.channel.send(addedqueue);
            //message.reply('The song: **' + song.title + "** has been added to the queue list.");

            server.queue.push(`${song.url}`);
            server.channel.push(message.channel.id);
            server.videotitle.push(`${song.title}`);
            server.whoputdis.push("`" + args[2] + "`");
          });
          if (added_songs == 0)
            message.reply("All song(s) alrready in the queue.");
          else
            message.channel.send(`\`${args[2]}\`` + " Playlist has been started. " + added_songs + " songs added to the queue.");

          if (!message.guild.voiceConnection)
            message.member.voiceChannel.join().then(function(connection) {
              play(connection, message);
            }).catch(console.error);
          break;
        case "add":
          if (args[2]) {
            if (!playlist[args[2]])
              return message.channel.send(":no_entry_sign: Playlist is not exist.");
          }
          if (args[3] == '' || args[3] === undefined)
            return message.channel.send(`You must add a YouTube video url. Example: ${prefix}playlist add <url>`);
          YTDL.getInfo(args[3], (err, info) => {
            if (err)
              return message.channel.send(':no_entry_sign: Invalid YouTube Link: ' + err);
            if (playlist[args[2]].songs.length > 10)
              return message.reply(':no_entry_sign: You can just add at least 10 songs to playlist.');
            if (playlist[args[2]].songs.length) {
              for (var i = 0; i < playlist[args[2]].songs.length; i++) {
                if (playlist[args[2]].songs[i].url == args[3]) {
                  message.channel.send(':no_entry_sign: Already have this song. ');
                  return;
                }
              }
            }
            if (info.length_seconds < 1)
              return message.reply(" Live Videos are not allowed.");
            playlist[args[2]].songs.push({
              url: args[3],
              title: info.title
            });
            let addingMusic = JSON.stringify(playlist, null, 2);
            fs.writeFileSync(playlist_dir, addingMusic);
            message.channel.send("*Adding...*").then(message => {
              message.edit(`:white_check_mark: Added **${info.title}** to **${args[2]}** named playlist.`);
            });
          });
          break;
        case "create":
          if (!args[2])
            return;
          if (playlist[args[2]])
            return message.channel.send(":no_entry_sign: Already exist.");

          //let data = JSON.parse(fs.readFileSync('./songlist.json'));
          var u = 0;
          for (var k in playlist)
            if (playlist.hasOwnProperty(k)) {
              if (playlist[k].author == message.author.id)
                u = u + 1;
            }
          if (u >= 1)
            return message.channel.send(":no_entry_sign: You can't create playlist more than **1**");

          if (!playlist[args[2]])
            playlist[args[2]] = {
              server: message.guild.id,
              author: message.author.id,
              songs: []
            };

          let creatingPlaylist = JSON.stringify(playlist, null, 2);
          fs.writeFileSync(playlist_dir, creatingPlaylist);
          message.channel.send("*Creating...*").then(message => {
            message.edit(`:white_check_mark: ${args[2]} Playlist created.`);
          });
          break;
        case "songs":
          if (args[2]) {
            if (!playlist[args[2]])
              return message.channel.send(":no_entry_sign: Playlist is not exist.");
          }
          if (!playlist[args[2]].songs.length)
            return message.channel.send("This Playlist is empty! Add some with `" + prefix + "playlist add " + args[2] + " <url>`");
          let tosend = [];
          playlist[args[2]].songs.forEach((song, i) => {
            tosend.push(`${i+1}. [${song.title}](${song.url})`);
          });
          //message.channel.send(`__**${args[2]} Music Playlist:**__ Currently **${tosend.length}** songs in it ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
          message.channel.send(`\`${args[2]}\` Music Playlist: Currently **${tosend.length}** songs in it ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n`);

          const playlist_songs = new Discord.RichEmbed()
            .setAuthor("Music Playlist", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
            .setColor(16098851)
            .addField("Songs", tosend.slice(0, 15).join('\n'))
          message.channel.send(playlist_songs);
          break;
        case "mylist":
          var user_playlist = "";
          var u = 0;
          //var count = Object.keys(data).length;console.log(count);
          for (var k in playlist)
            if (playlist.hasOwnProperty(k)) {
              //console.log(k + " - " + playlist[k].server);
              if (playlist[k].author == message.author.id) {
                u = u + 1;
                user_playlist += k + "\n";
                //console.log(k + " - " + playlist[k].author);
              }
            }
          if (u == 0) {
            user_playlist += "Empty!";
          }
          //message.channel.send(`<@${message.author.id}>**'s Playlist List**\n`);
          const user_playlists = new Discord.RichEmbed()
            .setAuthor(`${message.author.username}` + "'s Playlists", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
            .setColor(16098851)
            .addField("Playlist Names", user_playlist)
          message.channel.send(user_playlists);
          break;
        case "delete":
          if (args[2]) {
            if (!playlist[args[2]])
              return message.channel.send(":no_entry_sign: Playlist is not exist.");
          }
          if (playlist[args[2]].author == message.author.id) {
            delete playlist[args[2]];

            let deletingPlaylist = JSON.stringify(playlist, null, 2);
            fs.writeFileSync(playlist_dir, deletingPlaylist);
            message.channel.send("*Deleting...*").then(message => {
              message.edit(`:white_check_mark: ${args[2]} Playlist deleted.`);
            });
          } else {
            message.reply("This is not your playlist.");
          }
          break;
        case "clear":
          if (args[2]) {
            if (!playlist[args[2]])
              return message.channel.send(":no_entry_sign: Playlist is not exist.");
          }
          if (playlist[args[2]].author == message.author.id) {
            delete playlist[args[2]].songs;
            playlist[args[2]] = {
              server: message.guild.id,
              author: message.author.id,
              songs: []
            };
            let clearingPlaylist = JSON.stringify(playlist, null, 2);
            fs.writeFileSync(playlist_dir, clearingPlaylist);
            message.channel.send("*Clearing...*").then(message => {
              message.edit(`:white_check_mark: ${args[2]} Playlist cleared.`);
            });
          } else {
            message.reply("This is not your playlist.");
          }
          break;
        default:
          message.reply("Try **" + prefix + "help!**");
      }
      break;
    case "skip":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!message.member.hasPermission("MANAGE_GUILD"))
        return message.author.send("Yetkin yok amk köylüsü");

      var server = servers[message.guild.id];
      if (message.guild.voiceConnection) {
        if (message.guild.me.voiceChannel)
          server.dispatcher.end();
      }
      break;
    case "stop":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!message.member.hasPermission("MANAGE_GUILD"))
        return message.author.send("Yetkin yok amk köylüsü");

      var server = servers[message.guild.id];
      if (message.guild.voiceConnection) {
        for (var i = server.queue.length - 1; i >= 0; i--) {
          server.queue.splice(i, 1);
        }
        if (message.guild.me.voiceChannel)
          server.queue = [];
        server.videotitle = [];
        server.whoputdis = [];
        server.channel = [];
        server.dispatcher.end();
        //console.log("[" + new Date().toLocaleString() + "], :" + message.author.id + " Stopped the queue.");
      }
      break;
    case "dc":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!message.member.hasPermission("MANAGE_GUILD"))
        return message.author.send("Yetkin yok amk köylüsü");
      if (message.guild.voiceConnection) {
        var server = servers[message.guild.id];
        server.queue = [];
        server.videotitle = [];
        server.whoputdis = [];
        server.channel = [];
        server.dispatcher.end();
      }
      break;
    case "volume":
      //var music_volume = guilds[message.guild.id].volume;

      async function settingvolume() {
        const embedvolume = new Discord.RichEmbed()
          .setDescription(":speaker: **Volume:** "+ guilds[message.guild.id].volume * 100 + "%")
          .setColor(16098851)
        let volumeset = await message.channel.send(embedvolume);
        volumeset.delete(30000);
      }

      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!message.member.hasPermission("MANAGE_GUILD"))
        return message.author.send("Yetkin yok amk köylüsü");
      if (!message.guild.me.voiceChannel)
        return settingvolume();
      var server = servers[message.guild.id];
      if (!args[1]) {
        settingvolume();
      }
      if (args[1] < 101) {
        guilds[message.guild.id].volume = Math.max(args[1] / 100);
        let settingMusicVolume = JSON.stringify(guilds, null, 2);
        fs.writeFileSync(guilds_dir, settingMusicVolume);
        server.dispatcher.setVolume(guilds[message.guild.id].volume);
        settingvolume();
      }
      if (args[1] > 100) {
        server.dispatcher.setVolume(args[1] / 100);
        setTimeout(function() {
          server.dispatcher.setVolume(guilds[message.guild.id].volume);
        }, 6500);

        message.channel.send(`:speaker: vOlUmE: ${Math.round(server.dispatcher.volume*100)}%`);
      }
      break;
    case "pause":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      var server = servers[message.guild.id];
      if (message.guild.me.voiceChannel)
        server.dispatcher.pause();
      message.reply("Music paused.");
      break;
    case "resume":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      var server = servers[message.guild.id];
      if (message.guild.me.voiceChannel)
        server.dispatcher.resume();
      break;
    case "lyrics":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      var server = servers[message.guild.id];
      if (!message.guild.voiceConnection)
        return;
      if (!server.queue[0])
        return message.reply("Nothing is playing right now.");
      YTDL.getInfo(server.queue[0], (err, info) => {
        if (err)
          return console.log(err);
        let [artist, title] = getArtistTitle(info.title, {
          defaultArtist: "null"
        });
        l.get(artist, title, function(err, res) {
          if (err)
            return message.author.send("We couldn't find the lyrics of that song...");

          const song_lyrics = new Discord.RichEmbed()
            .setColor(16098851)
            .setTitle("**Lyrics:** " + info.title)
            .setDescription(res.substring(0, 2048))
          message.author.send(song_lyrics);
          if (res.length > 2048) {
            const song_lyrics2 = new Discord.RichEmbed()
              .setColor(16098851)
              .setDescription(res.substring(2048, 4096))
            message.author.send(song_lyrics2);
          }
        });
      });
      break;
    case "shuffle":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      if (!message.guild.me.voiceChannel)
        return message.reply("Nothing.");
      var server = servers[message.guild.id];
      if (!server.queue[0])
        return message.reply("Nothing is playing.");
      if (server.queue.length < 3)
        return message.channel.send("I can't shuffle an empty queue/queue of one song!");

      var originalQueue = server.queue;

      function shuffle(a, b, c) {
        var j,
          x,
          i;
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
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");

      var server = servers[message.guild.id];
      if (!server.queue[0])
        return message.reply("Nothing is playing.");
      if (!server.queue.length)
        return message.reply("Add some music nigga");
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
          .addField("Playing Now", "[" + server.videotitle[0] + "](" + server.queue[0] + ") (by " + server.whoputdis[0] + ")")
          .setColor(16098851)
          .addField("Queue", tracksInfos)
        message.channel.send(embedqueue);
      } else {
        const embedqueue = new Discord.RichEmbed()
          .setAuthor("Queue List", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
          .addField("Playing Now", "[" + server.videotitle[0] + "](" + server.queue[0] + ") (by " + server.whoputdis[0] + ")")
          .setColor(16098851)
        message.channel.send(embedqueue);
      }
      break;
    case "serverinfo":
      if (message.channel.type == 'dm')
        return message.reply("You can not use this in DM");
      var content = "",
        roles = [],
        txtchn = [],
        vchn = [],
        online = 0,
        idle = 0,
        dnd = 0,
        presencearr = [];
      var createstamp = message.guild.createdTimestamp;
      var creatediff = new Date().getTime() - createstamp;
      for (var i = 0; i < message.guild.roles.array().length; i++) {
        if (message.guild.roles.array()[i].name !== "@everyone")
          roles.push(message.guild.roles.array()[i]);
      }
      for (var i = 0; i < message.guild.channels.array().length; i++) {
        if (message.guild.channels.array()[i].type === "text")
          txtchn.push(message.guild.channels.array()[i]);
        else
          vchn.push(message.guild.channels.array()[i]);
      }
      for (var i = 0; i < message.guild.presences.array().length; i++) {
        switch (message.guild.presences.array()[i].status) {
          case "online":
            online++;
            break;
          case "idle":
            idle++;
            break;
          case "dnd":
            dnd++;
            break;
        }
      }
      if (online)
        presencearr.push(online + " online");
      if (idle)
        presencearr.push(idle + " idle");
      if (dnd)
        presencearr.push(dnd + " silenced");
      content += "Name: " + (message.guild.name + " (ID: " + message.guild.id + ")") + "\n";
      content += "Owner: `" + message.guild.owner.user.username + "#" + message.guild.owner.user.discriminator;
      content += (message.guild.owner.nickname ? " (" + message.guild.owner.nickname + ")`\n" : "`\n");
      content += "Region: " + message.guild.region + "\n";
      content += "Created: " + (new Date(createstamp).toUTCString()) + "\n";
      content += "User Count: " + (message.guild.memberCount.toString() + " (" + presencearr.join(', ') + ")") + "\n";
      content += "Roles (" + roles.length + "): " + roles.sort().join(', ') + "\n";
      content += "Text Channels (" + txtchn.length + "): " + txtchn.join(', ') + "\n";
      content += "Voice Channels (" + vchn.length + "): " + vchn.join(', ') + "\n";
      content += message.guild.iconURL;
      message.channel.send(content);
      break;
    case "feedback":
      var feedback = message.content.substring(prefix.length + 8);
      if (!feedback[1])
        return message.author.send("Please write what you know about the bug...");
      if (feedback.length < 3)
        return message.author.send("Kidding right?");
      if (message.channel.type != 'dm') {
        message.delete();
        message.channel.createInvite()
          .then(invite => za(invite.code))
          .catch(console.error);
      } else {
        za("dm");
      }

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
    case "bug":
      var bug = message.content.substring(prefix.length + 3);
      if (!bug[1])
        return message.author.send("Please write what you know about the bug...");
      if (bug.length < 3)
        return message.author.send("Kidding right?");
      if (message.channel.type != 'dm') {
        message.delete();
        message.channel.createInvite()
          .then(invite => za(invite.code))
          .catch(console.error);
      } else {
        za("dm");
      }

      function za(invite) {
        const bug_embed = new Discord.RichEmbed()
          .setColor(13632027)
          .setTitle("Bug")
          .setDescription(bug)
          .setFooter("Sent by " + message.author.username + ":" + message.author.id + " -> " + invite)
        bot.users.get("139144182794027009").send(bug_embed);
        message.author.send("Thanks for improving the Bot! You're so special for us, have a nice day.");
      }
      break;
    case "settings":
      if (!args[1]) {
        return;
      }
      switch (args[1].toLowerCase()) {
        case "setprefix":
          if (message.channel.type == 'dm')
            return message.reply("You can not use this in DM");
          if (!message.member.hasPermission("MANAGE_GUILD"))
            return message.author.send("Yetkin yok amk köylüsü");
          if (!args[2])
            return message.channel.send("Type a prefix for the bot.");
          else if (args[2].length > 3 || args[2].length <= 0) {
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
          if (message.channel.type == 'dm')
            return message.reply("You can not use this in DM");
          if (!message.member.hasPermission("MANAGE_GUILD"))
            return message.author.send("Yetkin yok amk köylüsü");
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
    case "help":
      if (!args[1]) {
        const help_main = [];

        help_main.push('\nHere\'s a list of all my commands:\n');
        help_main.push("**Main**\n");
        help_main.push("`settings`\n");
        help_main.push("**Music**\n");
        help_main.push("`play, skip, stop, volume, pause, resume, queue, playlist, shuffle, lyrics`");
        help_main.push("\n**Others**\n");
        help_main.push("`ping, serverinfo, bug, feedback`");
        help_main.push(`\nYou can send \`${prefix}help \` to get info on a specific command! (example: \`${prefix}help playlist\`)`);
        help_main.push(`\nIf you want to check prefix, just mention bot in the server.`);

        message.author.send(help_main, {
            split: true
          })
          .then(() => {
            if (message.channel.type !== 'dm') {
              message.reply('I\'ve sent you a DM with all my commands!');
            }
          })
          .catch(() => message.reply('it seems like I can\'t DM you!'));
        return
      }
      switch (args[1].toLowerCase()) {
        case "play":
          const help_play = [];

          help_play.push("\n**" + prefix + "Play**\n");
          help_play.push("`play <url>, play <name_of_the_song>`");
          help_play.push("\n**Examples**");
          help_play.push("**1** " + prefix + "play **<https://www.youtube.com/watch?v=eH4F1Tdb040>**");
          help_play.push("**2** " + prefix + "play **Stephen - Crossfire**");

          message.author.send(help_play, {
              split: true
            })
            .then(() => {
              if (message.channel.type !== 'dm') {
                message.reply('I\'ve sent you a DM with all my commands!');
              }
            })
            .catch(() => console.log("DM Error"));
          break;
        case "settings":
          const help_settings = [];

          help_settings.push("\n**" + prefix + "Settings**\n");
          help_settings.push("`settings setprefix, settings setchannel`");
          help_settings.push("\n**Description**");
          help_settings.push("**-** If you don't know the Server's current prefix, just Mention the bot.");
          help_settings.push("**-** If you want to remove channel rule, run the command twice.");

          message.author.send(help_settings, {
              split: true
            })
            .then(() => {
              if (message.channel.type !== 'dm') {
                message.reply('I\'ve sent you a DM with all my commands!');
              }
            })
            .catch(() => console.log("DM Error"));
          break;
        case "playlist":
          const help_playlist = [];

          help_playlist.push("\n**" + prefix + "Playlist**\n");
          help_playlist.push("`playlist mylist, playlist create <playlist_name>, playlist add <playlist_name> <url>, playlist songs <playlist_name>, playlist start <playlist_name>`");
          help_playlist.push("`playlist clear <playlist_name>, playlist delete <playlist_name>`");
          help_playlist.push("\n**Examples**");
          help_playlist.push("**1** " + prefix + "playlist create **example**");
          help_playlist.push("**2** " + prefix + "playlist add **example** **<https://www.youtube.com/watch?v=eH4F1Tdb040>**");
          help_playlist.push("**3** " + prefix + "playlist songs **example**");
          help_playlist.push("**4** You need to be in the Voice Channel for use, " + prefix + "playlist start **example**");
          help_playlist.push(`\nFor better use, you can try DM.`);

          message.author.send(help_playlist, {
              split: true
            })
            .then(() => {
              if (message.channel.type !== 'dm') {
                message.reply('I\'ve sent you a DM!');
              }
            })
            .catch(() => console.log("DM Error"));
          break;

        default:
          message.author.send("It's easy to find out! You can do it with your brain!");
      }
      break;
      case "lang":
       //lang_en[str1]
         message.reply(lang_en[str1] + " = " + lang_tr[str1]);
       break;
    default:
      message.reply("Ne boş adamsın aq");
  }
});

bot.login(process.env.BOT_TOKEN);
