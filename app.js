var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

app.get('/js/jquery.min.js', function (req, res) {
  res.sendfile(__dirname + '/js/jquery.min.js');
});
app.get('/js/bootstrap.js', function (req, res) {
  res.sendfile(__dirname + '/js/bootstrap.js');
});
app.get('/js/main.js', function (req, res) {
  res.sendfile(__dirname + '/js/main.js');
});
app.get('/css/bootstrap.css', function (req, res) {
  res.sendfile(__dirname + '/css/bootstrap.css');
});
app.get('/css/style.css', function (req, res) {
  res.sendfile(__dirname + '/css/style.css');
});