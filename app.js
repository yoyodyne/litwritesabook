var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    compress = require('compression')(),
    sqlite3 = require('sqlite3');

app.use(compress);
app.disable('x-powered-by');

app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', "http://"+req.headers.host+':8000');

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        next();
    }
);

var port = process.env.OPENSHIFT_NODEJS_PORT || 8000,
    ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

server.listen(port,ip);

var livenotes = {};
var databaseLoc = (process.env.OPENSHIFT_DATA_DIR)?process.env.OPENSHIFT_DATA_DIR+"livenote.sqlite3" : "livenote.sqlite3";
var db = new sqlite3.Database(databaseLoc);
db.run("CREATE TABLE notes (id TEXT PRIMARY KEY, note TEXT, updateTime INTEGER)",function(err){
  //console.log(err);
});


io.on('connection', function (socket) {
  var tout;
  socket.on('init', function (data,callback) {
    socket.join(data.id); //join room
    socket.draftid = data.id;
    var clientNumber = Object.keys(socket.adapter.rooms[data.id]).length; //count clients in room

    socket.broadcast.to(data.id).emit('clientChange', {num:clientNumber});//send client numbers.

    if(livenotes[data.id]){
      //send notes from variable if available
      callback({ note: livenotes[data.id],num:clientNumber});
    } else {
      //if not available, fetch from database and then send it.
      db.get("SELECT id,note FROM notes WHERE id = ?",[data.id],function(err,row){
        if(row){
          callback({ note: decodeURIComponent(row.note),num:clientNumber});
          livenotes[data.id] = decodeURIComponent(row.note);
        } else {
          callback({ note: "" ,num: clientNumber});
          livenotes[data.id] = "";
        }
      });
    }
  });

  socket.on("changeNote",function(data){
        //cancel pushing to database.
      clearTimeout(tout);
      //send data back to clients.
      socket.broadcast.to(socket.draftid).emit('changeBackNote', data);

      //count diff and prepare new note.
      var newval = livenotes[socket.draftid];
      var op = data.op;
      if(op.d!==null) {
        newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
      }
      if(op.i!==null){
        newval = newval.insert(op.p,op.i);
      }
      livenotes[socket.draftid] = newval;

      //now push to database after 2 seconds.
      tout = setTimeout(function(){
        db.run("INSERT OR REPLACE INTO notes ('id', 'note','updateTime') VALUES (?,?,?)",[socket.draftid,encodeURIComponent(newval),new Date().valueOf()]);
      },2000);
  });

  socket.on("delNote",function(data){
      db.run("DELETE FROM notes WHERE id=?",[socket.draftid]);
      socket.broadcast.to(socket.draftid).emit('delBackNote', {});
  });

  socket.on("disconnect",function(){
      var room  = socket.draftid;
      socket.leave(room);//leave room
      var clientNumber = Object.keys(socket.adapter.rooms[room]).length; //count clients in room.

      if(clientNumber==0){
        livenotes[room] = null;
      } else {
        socket.broadcast.to(room).emit('clientChange', {num:clientNumber});
      }
  });
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/favicon.ico', function (req, res) {
  res.sendfile(__dirname + '/favicon.ico');
});
app.get('/terms', function (req, res) {
  res.sendfile(__dirname + '/terms.html');
});

app.get('/:id', function (req, res) {
  var serverId = new Date().valueOf();
  if(req.params.id.length == 11){
    var clientId = parseInt(req.params.id,16);
  } else if (req.params.id.length == 16){
    var clientId = parseInt(req.params.id.substring(5),16);
  } else {
    res.redirect(302,"http://www.livenote.org");
  }
  if(isNaN(clientId) || !/^[0-9a-z]+$/.test(clientId)){
    res.redirect(302,"http://www.livenote.org");
  } else if(clientId < serverId+30000 && clientId > serverId-600000){
    res.sendfile(__dirname + '/notes.html');
  } else if(clientId < serverId){
    db.get("SELECT id,note FROM notes WHERE id = ?",req.params.id,function(err,row){
        if(row){
          res.sendfile(__dirname + '/notes.html');
        } else {
          res.redirect(302,"http://www.livenote.org");
        }
    });
  } else {
    res.redirect(302,"http://www.livenote.org");
  }
});

app.use("/public", express.static(__dirname + "/public"));


String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};



