//Requirements.
const fs = require('fs');
const async = require('async');
const guilds_dir = './guilds.json';
const {
  token,
  youtubeToken
} = require('./config.json');
const lang = JSON.parse(fs.readFileSync('./language.json'));
var defaultLang = "en";

//Discord framework
const Discord = require('discord.js');

//Youtube Token
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(yotubeToken);


//Youtube downloader framework.
const YTDL = require('ytdl-core');

// Server status.
const now = require('performance-now');

// Role configs
const roles = JSON.parse(fs.readFileSync('./roles.json'));
const guilds = JSON.parse(fs.readFileSync('./guilds.json'));

// Options
const ytdlOptions = {
  filter: "audioonly",
  quality: "lowest"
};

// Lyrics codes
const l = require("lyric-get");
const getArtistTitle = require('get-artist-title');


var bot = new Discord.Client({
  autoReconnect: true,
  max_message_cache: 0
});

var servers = {};

//Playing now music procedures.
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

  let r = await embedmain.createReactionCollector(filter, {
    maxUsers: 10,
    time: 700000
  });
  //emoji pull
  r.on('collect', (reaction, reactionCollector, user) => {

    if (bot.user.id == reaction.users.last().id)
      return;

    var channel_users = message.guild.me.voiceChannel.members.size - 1;

    var votes = reaction.users.size - 1;

    var votes_need = Math.ceil(channel_users*2/10) - votes;

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
}//embedMusic

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

bot.on('message', message => {
//DM'ye mi mesaj geldi

    if (message.author.equals(bot.user))
      return;


      if (message.channel.type == 'dm')
      {//DM mesajları
        var prefix = "";

      }//DM mesajları
      else
      {//Kullanıcı mesajları
        if (!message.content.startsWith(prefix))
          return;

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


          var args = message.content.substring(prefix.length).split(" ");
          var argss = args[1].split("?v=");
          var videoname = message.content.substring(prefix.length).split("play");
          var url = message.content.substring(prefix.length).split("playlistadd");



          switch (args[0].toLowerCase()) {

            case "play": //burada kaldık
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

              var pattern = new RegExp("(https*:\/\/)*(www.){0,1}youtube.com\/(.*)");
              var pattern2 = new RegExp("(https*:\/\/)*(www.){0,1}youtu.be\/(.*)");

              // Link yollanırsa
              if (pattern.test(args[1]) || pattern2.test(args[1])) {
                  var vUrl = args[1];
              } else {
                //Yazı olarak geldiyse
                youtube.searchVideos(videoname, 1)
                  .then(results => {
                    if (!results[0])
                      return message.reply("We couldn't find the actual video.");

                    var vUrl = results[0].url;
              }

              youtube.getVideo(vUrl)
                .then(video => {
                  if (video.durationSeconds < 1)
                    return message.reply("Live Videos are not allowed.");

                  if (server.queue.indexOf(args[1])>=0)
                    return message.reply('Already in the queue. ');

                  server.queue.push(args[1]);
                  server.channel.push(message.channel.id);
                  server.whoputdis.push(message.author.username);
                  server.videolengh.push(video.durationSeconds);
                  server.videotitle.push(video.title);

                  if (!server.queue[0]) {
                    const addedqueue = new Discord.RichEmbed()
                      .setDescription("**[" + video.title + "](" + args[1] + ")** started firstly.")
                      .setColor(16098851)
                    message.channel.send(addedqueue);
                  }else if (server.queue[0]) {
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

              break;

              case "skip":
                if (!message.member.hasPermission("MANAGE_GUILD"))
                  return message.author.send("Insufficient permission.");

                var server = servers[message.guild.id];
                if (message.guild.voiceConnection) {
                  if (message.guild.me.voiceChannel)
                    server.dispatcher.end();
                }
                break;

              case "volume":
                if (!message.member.hasPermission("MANAGE_GUILD"))
                  return message.author.send("Yetkin yok amk köylüsü");


                var server = servers[message.guild.id];

                async function settingvolume() {
                  const embedvolume = new Discord.RichEmbed()
                    .setDescription(":speaker: **Volume:** " + guilds[message.guild.id].volume * 100 + "%")
                    .setColor(16098851)
                  let volumeset = await message.channel.send(embedvolume);
                  volumeset.delete(30000);
                }

                if (!args[1]){
                  settingvolume();
                }else{
                  if (args[1] <= 100) {
                    guilds[message.guild.id].volume = Math.max(args[1] / 100);
                    let settingMusicVolume = JSON.stringify(guilds, null, 2);
                    fs.writeFileSync(guilds_dir, settingMusicVolume);
                    server.dispatcher.setVolume(guilds[message.guild.id].volume);
                    settingvolume();
                  }else if (args[1] > 100) {

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

                var server = servers[message.guild.id];

                if (message.guild.voiceConnection && message.guild.me.voiceChannel) {
                    server.queue = [];
                    server.videotitle = [];
                    server.whoputdis = [];
                    server.channel = [];
                    server.dispatcher.end();
                }
                break;

            case "ping":
              var sent = new Date().getTime();
              message.channel.send("Bot ping: " + Math.trunc(bot.ping) + "ms.").then(message => {
                message.edit(`${message.content} Ms: ${new Date().getTime() - sent}.`);
              });
              break;
            default:
              message.reply("Command doesn't exist.");

          }


      }//Kullanıcı Mesajları

});

bot.login(process.env.BOT_TOKEN);
