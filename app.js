var express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, io = require('socket.io').listen(server)
, sqlite3 = require('sqlite3');

server.listen(8080);

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