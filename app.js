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
      } else {
        socket.emit('setNote', { note: "" });
      }
    //res.send(row.note);
    });
  });

  socket.on("changeNote",function(data){
    socket.broadcast.to(data.id).emit('changeBackNote', data);
    db.get("SELECT id,note FROM notes WHERE id = ?",[data.id],function(err,row){
      var newval;
      if(row){
        newval = decodeURIComponent(row.note);
      } else {
        newval= "";
      }
      var op = data.op;
      if(op.d!==null) {
        newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
      }
      if(op.i!==null){
        newval = newval.insert(op.p,op.i);
      } 
      db.run("INSERT OR REPLACE INTO notes ('id', 'note') VALUES (?,?)",[data.id,encodeURIComponent(newval)]);
    });
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



