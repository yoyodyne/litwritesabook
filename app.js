var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(8080);

io.static.add('/jquery.min.js', {file: 'js/jquery.min.js'});
io.static.add('/bootstrap.js', {file: 'js/bootstrap.js'});
io.static.add('/bootstrap.css', {
  mime: {
    type: 'text/css',
    encoding: 'utf8',
    gzip: true
  },
  file: 'css/bootstrap.css'
});
io.static.add('/style.css', {
  mime: {
    type: 'text/css',
    encoding: 'utf8',
    gzip: true
  },
  file: 'css/style.css'
});
io.static.add('/bg.jpg', {
  mime: {
    type: 'image/jpeg',
    encoding: 'utf8',
    gzip: true
  },
  file: 'img/bg.jpg'
});

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});