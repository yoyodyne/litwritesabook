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

var livenotes = new Object();
var databaseLoc = (process.env.OPENSHIFT_DATA_DIR)?process.env.OPENSHIFT_DATA_DIR+"livenote.sqlite3" : "livenote.sqlite3";
var db = new sqlite3.Database(databaseLoc); 
db.run("CREATE TABLE notes (id TEXT PRIMARY KEY, note TEXT, updateTime INTEGER)",function(err){
  //console.log(err);
});


io.sockets.on('connection', function (socket) {
  var tout;
  socket.on('getNote', function (data) {
    socket.join(data.id); //join room
    var clientNumber = io.sockets.clients(data.id).length; //count clients in room

    socket.broadcast.to(data.id).emit('clientChange', {num:clientNumber});//send client numbers.

    if(livenotes[data.id]){
      //send notes from variable if available
      socket.emit('setNote', { note: livenotes[data.id],num:clientNumber});
    } else {
      //if not available, fetch from database and then send it.
      db.get("SELECT id,note FROM notes WHERE id = ?",[data.id],function(err,row){
        if(row){
          socket.emit('setNote', { note: decodeURIComponent(row.note),num:clientNumber});
          livenotes[data.id] = decodeURIComponent(row.note);
        } else {
          socket.emit('setNote', { note: "" ,num: clientNumber});
          livenotes[data.id] = "";
        }
      });
    }
  });

  socket.on("changeNote",function(data){
    //cancel pushing to database.
    clearTimeout(tout);
    //send data back to clients.
    socket.broadcast.to(data.id).emit('changeBackNote', data);

    //count diff and prepare new note.
    var newval = livenotes[data.id];
    var op = data.op;
    if(op.d!==null) {
      newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
    }
    if(op.i!==null){
      newval = newval.insert(op.p,op.i);
    } 
    livenotes[data.id] = newval;

    //now push to database after 2 seconds.
    tout = setTimeout(function(){
      db.run("INSERT OR REPLACE INTO notes ('id', 'note','updateTime') VALUES (?,?,?)",[data.id,encodeURIComponent(newval),new Date().valueOf()]);
    },2000);
  });



  socket.on("disconnect",function(){
    //get room id
    var room = Object.keys(io.sockets.manager.roomClients[socket.id]);
    room.splice(room.indexOf(""),1);
    room = room[0].substring(1);

    socket.leave(room);//leave room
    var clientNumber = io.sockets.clients(room).length; //count clients in room.

    if(clientNumber==0){
      delete livenotes[room];
    } else {
      socket.broadcast.to(room).emit('clientChange', {num:clientNumber});
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



