var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.use(express.static(__dirname + '/web/'));

app.get('/', function(req, res) {});

app.listen(app.get('port'), function() {
  console.log('Mounted ' + app.get('port'));
});
