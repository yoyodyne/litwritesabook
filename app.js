var express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, io = require('socket.io').listen(server)
, sqlite3 = require('sqlite3');

if(process.env.OPENSHIFT_NODEJS_PORT){
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', ['websocket']);
}

var port = process.env.OPENSHIFT_NODEJS_PORT || 8000
, ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

server.listen(port,ip);

var db = new sqlite3.Database('livenote.sqlite3'); 
// db.run("CREATE TABLE notes (id TEXT PRIMARY KEY, note TEXT)",function(err){
//  console.log(err);
// });
//db.run("insert into notes (id,note) values ('ddd','This is note.')")


io.sockets.on('connection', function (socket) {
  socket.on('getNote', function (data) {
    db.get("select id,note from notes where id = '"+data.id+"'",function(err,row){
      if(row){
        socket.emit('setNote', { note: row.note });
      } else {
        socket.emit('setNote', { note: "" });
      }
    //res.send(row.note);
  });
  });
  socket.on("changeNote",function(data){
    socket.broadcast.emit('changeBackNote', data);
    db.run("INSERT OR REPLACE INTO notes ('id', 'note') VALUES ('"+data.id+"', '"+data.note+"' )");
  })
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/:id', function (req, res) {
  res.sendfile(__dirname + '/notes.html');
//  res.send(req.params.id);
});

app.use("/public", express.static(__dirname + "/public"));