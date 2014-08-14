var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    compress = require('compression')(),
    sqlite3 = require('sqlite3');
    cookieSession = require('cookie-session')
    tripcode = require('tripcode');



app.use(compress);
app.disable('x-powered-by');

app.use(cookieSession({
    keys: ['litwritesabook_secret', 'secret2']
}));


app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', "http://"+req.headers.host+':8000');

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        next();
    }
);

ids = {'Outline': 'outline',
       'Chapter 1': 'chap1',
       'Title': 'title'
      };

function inb4 (id) {
	for (var i in ids) {
		if (id == ids[i]) {
			return id;
		}
	};
	return false;
};

var lit = {

  port : 8000,

  ip : "127.0.0.1",

  notes: {},

  databaseLoc : "lit.sqlite3",

  db : null,

};

lit.db = new sqlite3.Database(lit.databaseLoc);

server.listen(lit.port, lit.ip);

for (var id in ids){
  lit.db.run("CREATE TABLE "+ids[id]+" (note TEXT, updateTime INTEGER);",function(err){
    //console.log(err);
  });
}
lit.db.run("CREATE TABLE tripcode (code TEXT PRIMARY KEY ,trip TEXT, wordCount INTEGER);", function(err){
  //console.log(err)
});


io.on('connection', function (socket) {
  var tout;
  socket.on('init', function (data,callback) {
    socket.join(data.id); //join room
    socket.draftid = data.id;
    var clientNumber = Object.keys(socket.adapter.rooms[data.id]).length; //count clients in room

    socket.broadcast.to(data.id).emit('clientChange', {num:clientNumber});//send client numbers.

    if(lit.notes[data.id]){
      //send notes from variable if available
      callback({ note: lit.notes[data.id],num:clientNumber});
    } else {
      //if not available, fetch from database and then send it.
      lit.db.get("SELECT note FROM "+inb4([data.id])+" ORDER BY updateTime DESC LIMIT 1",function(err,row){
        if(row){
          callback({ note: decodeURIComponent(row.note),num:clientNumber});
          lit.notes[data.id] = decodeURIComponent(row.note);
        } else {
          callback({ note: "" ,num: clientNumber});
          lit.notes[data.id] = "";
        }
      });
    }
  });
  socket.on("addCount", function(data){
    lit.db.get("SELECT wordCount FROM tripcode WHERE code = '"+data.trip+"'", function( err, row){
      if (row) {
        var original;
        original = row.wordCount == null ? (0) :(parseInt(row.wordCount));
        lit.db.run("UPDATE tripcode SET wordCount ="+ (parseInt(data.count) + original ) +" WHERE code='" +data.trip+"';", function(err){
          //console.log(err);
        });
      } else if (err) {
        //console.log(err);
      }
    });

  });
  socket.on("changeNote",function(data){
        //cancel pushing to database.
      clearTimeout(tout);
      //send data back to clients.
      socket.broadcast.to(socket.draftid).emit('changeBackNote', data);

      //count diff and prepare new note.
      var newval = lit.notes[socket.draftid];
      var op = data.op;
      if(op.d!==null) {
        newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
      }
      if(op.i!==null){
        newval = newval.insert(op.p,op.i);
      }
      lit.notes[socket.draftid] = newval;

      //now push to database after 2 seconds.
      tout = setTimeout(function(){
	   lit.db.run("INSERT INTO "+inb4(socket.draftid)+" ('note', 'updateTime') VALUES (?,?)",
        [encodeURIComponent(newval),new Date().valueOf()]); 
      },2000);
  });

  socket.on("disconnect",function(){
      var room  = socket.draftid;
      socket.leave(room);//leave room
      var clientNumber = Object.keys(socket.adapter.rooms[room]).length; //count clients in room.

      if(clientNumber===0){
        lit.notes[room] = null;
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
app.get('/leaderboard', function(req,res){
  res.sendfile(__dirname + '/leaderboard.html');
})

app.get('/:id', function (req, res) {
  if (inb4(req.params.id)) {
    res.sendfile(__dirname + '/notes.html');
  } else {
    res.redirect(302,"http://www.litwritesabook.com");
    console.log('Unknown error. This app is doomed.');
  }
});

app.get('/log/:id', function (req, res) {
  if (inb4(req.params.id)) {
    res.sendfile(__dirname + '/log.html');
  } else {
    res.redirect(302,"http://litwritesabook.com");
  }
});

app.get('/api/getlog/:id', function (req, res) {
  if (inb4(req.params.id)) {
    lit.db.all("SELECT * FROM "+req.params.id+" ORDER BY updateTime DESC LIMIT 10",function(err,rows){
      if(rows) res.send(rows);
        else  res.send({'error': '404'});
    });
  } else res.send({'error': '500'});
});


app.get('/api/getchans', function (req, res) {
  res.send(ids);
});


app.get('/api/gettripcode/:trip', function (req, res) {
  var trip = req.params.trip.split('#');
  var username = trip[0];
  var password = trip[1];
  if (username && password) {
    trip = tripcode( password );
    rettrip = username+'!'+trip;
    lit.db.get("SELECT trip FROM tripcode WHERE code='"+username+"';", function (err, row){ 
      if ( row && trip == row.trip ) { 
        res.cookie('trip',rettrip);
        res.send(rettrip);
        loggedIn = true;
      } else if (row && trip != row.trip) {
        res.json({'error': 'wrong password'});
      } else if (! row ){ // not in db
        lit.db.run("INSERT INTO tripcode (code,trip) VALUES (\""+username+"\",'"+trip+"')", function (err) { // add new tripcode
          //console.log('212',err);
        });
        res.cookie('trip', rettrip);
        res.send(rettrip);
      }
    });
  } else {
    res.json({'error':'format'});
  }
});

app.get('/api/getleaderboard', function (req, res){
  lit.db.all("SELECT * FROM tripcode ORDER BY wordCount DESC",function(err,rows){
    if(rows) res.json(rows);
    else res.json({'error': '404'});
  });
});
app.use("/public", express.static(__dirname + "/public"));


String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};
