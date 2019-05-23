// TODOS
// Fix the volume. It's not working.
// DM Help menu
// Faster embedmusic. Nearly fixed
// Maybe, playlist will rise again?


// Requirements
//const opus = require('opusscript'); // nodeopus is better
//const ffmepg = require('ffmpeg-binaries');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));
app.use(express.static(__dirname + '/web/'));

app.get('/', function(req, res) {});

app.listen(app.get('port'), function() {
  console.log('Mounted ' + app.get('port'));
});

app.post ('/', function(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString(); // convert Buffer to string
    });
    req.on('end', () => {
        console.log(body);
        res.end('ok');
    });
  }
});
