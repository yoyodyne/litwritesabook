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

var databaseLoc = (process.env.OPENSHIFT_DATA_DIR)?process.env.OPENSHIFT_DATA_DIR+"livenote.sqlite3" : "livenote.sqlite3";
var db = new sqlite3.Database(databaseLoc); 
var livenotes = new Object();
db.run("CREATE TABLE notes (id TEXT PRIMARY KEY, note TEXT)",function(err){
  console.log(err);
});
//db.run("insert into notes (id,note) values ('ddd','This is note.')")


io.sockets.on('connection', function (socket) {

  socket.on('getNote', function (data) {
    socket.join(data.id);
    db.get("SELECT id,note FROM notes WHERE id = ?",[data.id],function(err,row){
      if(row){
        socket.emit('setNote', { note: decodeURIComponent(row.note)});
        livenotes[data.id] = decodeURIComponent(row.note);
      } else {
        socket.emit('setNote', { note: "" });
        livenotes[data.id] = "";
      }
    //res.send(row.note);
    });
  });

  socket.on("changeNote",function(data){
    socket.broadcast.to(data.id).emit('changeBackNote', data);
    var newval = livenotes[data.id];
    var op = data.op;
    if(op.d!==null) {
      newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
    }
    if(op.i!==null){
      newval = newval.insert(op.p,op.i);
    } 
    livenotes[data.id] = newval;
    db.run("INSERT OR REPLACE INTO notes ('id', 'note') VALUES (?,?)",[data.id,encodeURIComponent(newval)]);
  });

  socket.on("disconnect",function(){
    var room = Object.keys(io.sockets.manager.roomClients[socket.id]);
    room.splice(room.indexOf(""),1);
    room = room[0].substring(1);
    if(io.sockets.clients(room).length<=1){
      delete livenotes[room];
    }
  });
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/:id', function (req, res) {
  res.sendfile(__dirname + '/notes.html');
//  res.send(req.params.id);
});

app.use("/public", express.static(__dirname + "/public"));


String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};



