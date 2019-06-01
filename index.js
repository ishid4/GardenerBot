// TODOS
// Reaction collector rework. Check if user in the voicechannel..
// DM Help menu
// Faster embedmusic. Nearly fixed
// Maybe, playlist will rise again?
// MAIN PROBLEM: Server can not change JSON files due to Heroku. Need to fix ASAP
// Get volume from JSON when first play

/*
bot beleş buton paralı
login olduysa sayfayı kapatsın.

yetkileri azalt
https://discordapp.com/oauth2/authorize?client_id=422090619859632168&scope=bot&permissions=1341652417
*/

// Requirements
//const opus = require('opusscript'); // nodeopus is better
//const ffmepg = require('ffmpeg-binaries');



/*
"422091347198214144": {
  "name": "Developing Thyme",
  "owner": "139144182794027009",
  "prefix": "!",
  "volume": 1,
  "music_channel_id": "519468740325408789",
  "music_channel_name": "music"
},
"139771037486153728": {
  "name": "Konoha Merkez",
  "owner": "139146539900600320",
  "prefix": "!",
  "volume": "100",
  "music_channel_id": "",
  "music_channel_name": ""
}
*/

const configs = [
  process.env.BOT_TOKEN,
  process.env.YOUTUBE_TOKEN,
  process.env.API,
  process.env.CLIENTID,
  process.env.CLIENTSECRET
];

const request = require('request');
//const guilds_dir = require('./guilds.json');
//const configs = require('./config.json');
//const roles = JSON.parse(fs.readFileSync('./roles.json'));


const fs = require('fs'),
  async = require('async'),
    Discord = require('discord.js'),
    l = require("lyric-get"),
    getArtistTitle = require('get-artist-title');

const YTDL = require('ytdl-core-discord'),
  prism = require('prism-media'); // For volume

const express = require('express'),
  session = require('express-session'),
  passport = require('passport'),
  Strategy = require('./lib').Strategy,
  app = express();

const YouTube = require('simple-youtube-api');
const youtube = new YouTube(configs[1]);

const ytdlOptions = {
  filter: "audioonly",
  quality: "highestaudio"
};

var sessionUserId = false,
  scopes = ['identify'],
  servers = {},
  bot = new Discord.Client({
    autoReconnect: true,
    max_message_cache: 0
  });

let guilds;

app.set('port', (process.env.PORT || 3000));

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use('/public', express.static('public'));

app.listen(app.get('port'), function() {
  console.log('Mounted ' + app.get('port'));
/*
  request('https://api.erdem.in/api/guilds.json.php', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      const guildsJson = JSON.parse(body);
      console.log("Guilds data: OK!");
      guilds = guildsJson;
    }
  });*/

  request({
    method: 'post',
    url: 'https://api.erdem.in/api/guilds.json.php',
    form: {api:configs[2]},
    headers: {
      "content-type": "application/json"
    },
    json: true,
  }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
          /*const guildsJson = JSON.parse(body);
          console.log("Guilds data: OK!");
          guilds = guildsJson;*/
          console.log(body);
      }
  });

});

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new Strategy({
  clientID: configs[3],
  clientSecret: configs[4],
  callbackURL: 'https://gardener.erdem.in/callback',
  scope: scopes
}, function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
    return done(null, profile);
  });
}));

app.use(session({
  secret: 'ozkan kalp yag',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: (1000 * 60 * 60 * 24 * 7)
  }
}));
app.use(passport.initialize());
app.use(passport.session());


//////////////////////////////////////

function insertServer(data) {
  request({
    method: 'post',
    url: 'https://api.erdem.in/api/procedure.php',
    form: data,
    headers: {
      "content-type": "application/json"
    },
    json: true,
  });
}

function prefixUpdate(data) {
  request({
    method: 'post',
    url: 'https://api.erdem.in/api/procedure2.php',
    form: data,
    headers: {
      "content-type": "application/json"
    },
    json: true,
  });
}

function channelUpdate(data) {
  request({
    method: 'post',
    url: 'https://api.erdem.in/api/procedure3.php',
    form: data,
    headers: {
      "content-type": "application/json"
    },
    json: true,
  });
}

function volumeUpdate(data) {
  request({
    method: 'post',
    url: 'https://api.erdem.in/api/procedure4.php',
    form: data,
    headers: {
      "content-type": "application/json"
    },
    json: true,
  });
}

app.get('/', checkAuth, function(req, res) {
  //res.json(req.user.id);
  //res.send('Welcome ' + req.user.username + "#" + req.user.discriminator + '! <br> For use, invite bot <a href=\"https://discordapp.com/oauth2/authorize?client_id=422090619859632168&scope=bot&permissions=1341652417\">click.</a>');
  res.sendFile('public/index.html', {
    root: __dirname
  });
  sessionUserId = req.user.id;
  //res.redirect('/public/close.html');
});


app.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), function(req, res) {
  res.redirect('/');
});

app.get('/logout', function(req, res) {
  req.logout();
  sessionUserId = false;
  res.redirect('/');
});

app.get('/login', passport.authenticate('discord', {
  scope: scopes
}), function(req, res) {
  res.redirect('/');
});

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

app.post('/', function(req, res) {
  var vUrl = req.body.link;
  //console.log("DEBUG: vUrl: " + vUrl);
  if (!(sessionUserId == false)) {
    var userName = "🔸 <@" + sessionUserId + ">";
    videoPush2(vUrl, sessionUserId, userName);
  }
});

async function videoPush2(vUrl, uId, userName) {
  var vcId, gId;
  for (var findGuild in guilds) {
    var guild = bot.guilds.get(findGuild);

    await guild.fetchMember(uId).then(info => {
      if (info.voiceChannelID != undefined) {
        vcId = info.voiceChannelID;
        gId = findGuild;
      }
    }).catch(console.error);
    if (vcId)
      break;
  }
  console.log("DEBUG: User's VoiceChannel ID: " + vcId);
  console.log("DEBUG: VoiceChannel's guild ID " + gId);

  if (!bot.users.get(uId).hasPermission("MANAGE_GUILD"))
    return console.log("DEBUG: Insufficient permission.");

  if (!vcId)
    return console.log("DEBUG: User is not in the VoiceChannel");

  if (!guilds[gId].music_channel_id || guilds[gId].music_channel_id == "") {

    let channelID;
    let channels = guild.channels;
    channelLoop:
      for (let c of channels) {
        let channelType = c[1].type;
        if (channelType === "text") {
          channelID = c[0];
          break channelLoop;
        }
      }
    var tChannel = channelID;
  } else
    var tChannel = guilds[gId].music_channel_id;

  const textChannel = await bot.channels.get(tChannel);
  const voiceChannel = await bot.channels.get(vcId);

  if (!servers[gId])
    servers[gId] = {
      queue: [],
      whoputdis: [],
      videolength: [],
      videotitle: [],
      channel: [],
      lastmusicembed: []
    };
  var server = servers[gId];

  youtube.getVideo(vUrl)
    .then(video => {
      if (video.durationSeconds < 1)
        return textChannel.send("Live Videos are not allowed.");

      if (server.queue.indexOf(vUrl) >= 0)
        return textChannel.send('Already in the queue. ');

      if (!server.queue[0]) {
        let addedqueue = new Discord.RichEmbed()
          .setDescription("**[" + video.title + "](" + vUrl + ")** started firstly.")
          .setColor(16098851)
        textChannel.send(addedqueue);
      } else if (server.queue[0]) {
        let addedqueue = new Discord.RichEmbed()
          .setDescription("**[" + video.title + "](" + vUrl + ")** has been added to the queue.")
          .setColor(16098851)
        textChannel.send(addedqueue);
      }

      server.queue.push(vUrl);
      server.channel.push(tChannel);
      server.whoputdis.push(userName);
      server.videotitle.push(video.title);

      if (!voiceChannel.guild.voiceConnection)
        voiceChannel.join().then(function(connection) {
          play(connection, "", gId, textChannel, voiceChannel);
        }).catch(console.error);

    }).catch(console.error);
}

// Music Embed Show + Reaction Collect
async function embedmusic(info, duration, who, message, server, textChannel, voiceChannel) {
  var embedmusic = new Discord.RichEmbed()
    .setAuthor("Playing Now", "https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
    .setColor(16098851)
    .setFooter("Click ⏭ to Skip / ✍ to Lyrics")
    .setImage(info.maxRes.url)
    .setThumbnail("https://cdn.discordapp.com/avatars/422090619859632168/8ea8855a6d4459ffea5ff9aa261149c9.png?size=2048")
    .setTimestamp()
    .addField("Title", "**[" + info.title + "](" + info.url + ")**")
    .addField("Duration", duration, true)
    .addField("Who Put Dis?", who, true);

  if (!message)
    var embedmain = await textChannel.send(embedmusic);
  else
    var embedmain = await message.channel.send(embedmusic);

  server.lastmusicembed = await embedmain;
  await embedmain.react('⏭');
  embedmain.react('✍');

  const filter = (reaction) => reaction.emoji.name === '⏭' || reaction.emoji.name === '✍';

  let r = await embedmain.createReactionCollector(filter, {
    maxUsers: 10,
    time: 700000
  });

  // Skip and Lyrics (using_hand) emoji collect
  r.on('collect', (reaction, reactionCollector, user) => {

    if (bot.user.id == reaction.users.last().id)
      return;

    if (reaction.emoji.name === '✍') {
      let [artist, title] = getArtistTitle(server.videotitle[0], {
        defaultArtist: "null"
      });

      l.get(artist, title, function(err, res) {
        if (err)
          return bot.users.get(reaction.users.last().id).send("Bot couldn't find the lyrics of that song...");

        const song_lyrics = new Discord.RichEmbed()
          .setColor(16098851)
          .setTitle("**Lyrics:** " + server.videotitle[0])
          .setDescription(res.substring(0, 2048))
        bot.users.get(reaction.users.last().id).send(song_lyrics);
        if (res.length > 2048) {
          const song_lyrics2 = new Discord.RichEmbed()
            .setColor(16098851)
            .setDescription(res.substring(2048, 4096))
          bot.users.get(reaction.users.last().id).send(song_lyrics);
        }
      });
      return;
    }

    if (!message) {
      var channel_users = voiceChannel.guild.me.voiceChannel.members.size - 1;
      var IsUserinVC = 0;
    } else {
      var channel_users = message.guild.me.voiceChannel.members.size - 1;
      textChannel = message.channel;

      message.guild.fetchMember(reaction.users.last().id).then(info => {
        if (info.voiceChannelID != undefined)
          var IsUserinVC = 1;
      }).catch(console.error);
    }

    if (IsUserinVC == 0)
      return;

    var votes = reaction.users.size - 1;
    var votes_need = Math.ceil(channel_users * 2 / 10) - votes;

    if (votes >= votes_need) {
      if (server.dispatcher)
        server.dispatcher.end();
    } else {
      async function vote_info() {
        let inf = await textChannel.send("<@" + reaction.users.last().id + "> wants to skip. **" + votes_need + " votes** need to skip.");
        await inf.delete(10000);
      }
      vote_info();
    }
  });

} // embedMusic

// Main Play Function
async function play(connection, message, gId, textChannel, voiceChannel) {
  if (message)
    var server = servers[message.guild.id];
  else
    var server = servers[gId];

  youtube.getVideo(server.queue[0])
    .then(video => {
      if (video.durationSeconds < 1) {
        var videoDuration = "Live";
      } else {
        var videoDuration = Math.floor(video.durationSeconds / 60) + " mins " + Math.floor(video.durationSeconds % 60) + " secs";
      }
      embedmusic(video, videoDuration, server.whoputdis[0], message, server, textChannel, voiceChannel); // run function & pass required information
    }).catch(console.error);


  const input = await YTDL(server.queue[0])
  const pcm = input.pipe(new prism.opus.Decoder({
    rate: 48000,
    channels: 2,
    frameSize: 960
  }));

  server.dispatcher = connection.playConvertedStream(pcm); // For fixing volume

  //server.dispatcher = connection.playOpusStream(await YTDL(server.queue[0], ytdlOptions));

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
      play(connection, message, gId, textChannel, voiceChannel);
    } else {
      server.channel = [];
      connection.disconnect();
    }
  });
}

bot.on('uncaughtException', (err) => {
  console.error(err);
});

bot.on('ready', function() {
  console.log("And Loaded " + bot.guilds.size + " servers");
  var times = 1;
  const activities_list = [
    "help",
    bot.guilds.size + " servers",
  ];

  setInterval(() => {
    var index = times % 2;
    times++;
    bot.user.setActivity(activities_list[index], {
      type: "WATCHING"
    });
  }, 10000);
});

bot.on('message', message => {
  if (message.author.equals(bot.user))
    return;

  if (message.channel.type == 'dm') {
    var prefix = "";
    var args = message.content.substring(prefix.length).split(" ");

    switch (args[0].toLowerCase()) {
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
          help_main.push(`\nYou can send \`help \` to get info on a specific command! (example: \`help playlist\`)`);
          help_main.push(`\nIf you want to check prefix, just mention bot in the server.`);

          message.author.send(help_main, {
              split: true
            })
            .catch(() => console.log("ERROR: help couldn't send."));
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
    }
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
        server_id: message.guild.id,
        api: configs[2]
      };
      //let guildUpdate = JSON.stringify(guilds, null, 2);
      //fs.writeFileSync(guilds_dir, guildUpdate);
      insertServer(guilds[message.guild.id]);
    }

    var prefix = guilds[message.guild.id].prefix;
    var music_channel_id = guilds[message.guild.id].music_channel_id;
    var music_channel_id_fix = "<#" + music_channel_id + ">";

    if (server.queue[0])
      if (message.channel.id == server.channel[0])
        message.delete();

    if (message.isMentioned(bot.user))
      message.channel.send("Current Prefix: `" + prefix + "`\nCurrent Music Channel: " + music_channel_id_fix + "\nIf you need any help, Just `" + prefix + "help`");

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
        if (!message.member.hasPermission("MANAGE_GUILD"))
          return message.author.send("Insufficient permission.");

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
              server.whoputdis.push("<@" + message.author.id + ">");
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
            //let settingMusicVolume = JSON.stringify(guilds, null, 2);
            //fs.writeFileSync(guilds_dir, settingMusicVolume);

            var postdata = {
              server_id: message.guild.id,
              volume: guilds[message.guild.id].volume,
              api: configs[2]
            };
            console.log(postdata);
            volumeUpdate(postdata);

            if (server.queue[0])
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

              bot.users.get(message.guild.owner.user.id).send("Prefix changed to `" + args[2] + "` in **" + message.guild.name + "**");
              var postdata = {
                server_id: message.guild.id,
                prefix: args[2],
                api: configs[2]
              };
              prefixUpdate(postdata);
              message.channel.send("Prefix changed to `" + args[2] + "`");
            }
            break;

          case "setchannel":
            if (!message.member.hasPermission("MANAGE_GUILD"))
              return message.author.send("Insufficient permission.");
            if (message.channel.id == guilds[message.guild.id].music_channel_id) {
              guilds[message.guild.id].music_channel_id = "";
              message.channel.send("Music Channel changed to `all`");

              var postdata = {
                server_id: message.guild.id,
                music_channel_id: "all",
                api: configs[2]
              };
              channelUpdate(postdata);
              //let settingMusicChannel = JSON.stringify(guilds, null, 2);
              //fs.writeFileSync(guilds_dir, settingMusicChannel);
              return;
            }
            guilds[message.guild.id].music_channel_id = message.channel.id;
            message.channel.send("Music Channel changed to `" + message.channel.name + "`");
            bot.users.get(message.guild.owner.user.id).send("Music Channel changed to `" + message.channel.name + "` in **" + message.guild.name + "**");

            var postdata = {
              server_id: message.guild.id,
              music_channel_id: message.channel.id,
              api: configs[2]
            };
            //let settingMusicChannel = JSON.stringify(guilds, null, 2);
            //fs.writeFileSync(guilds_dir, settingMusicChannel);
            channelUpdate(postdata);
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

      case "help":
        message.author.send("Try `help` here.");
        break;

      default:
        message.reply("Command doesn't exist.");
    }
  } // Channel messages END

});


bot.login(configs[0]);
