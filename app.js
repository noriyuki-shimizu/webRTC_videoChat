/* 1. expressモジュールをロードし、インスタンス化してappに代入 */
var express = require("express");
var path = require("path");
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

/* 2. listen()メソッドを実行して3000番ポートで待ち受け */
var server = app.listen(3000, function() {
    console.log("Node.js is listening to PORT: " + server.address().port);
});

var io = require("socket.io").listen(server);

app.get("/", function(req, res, next) {
    res.render("index", {});
});

// This callback function is called every time a socket
// tries to connect to the server
io.on('connection', function(socket) {
    // ---- multi room ----
    socket.on('enter', function(roomname) {
      socket.join(roomname);
      console.log('id=' + socket.id + ' enter room=' + roomname);
      setRoomname(roomname);
    });

    function setRoomname(room) {
      socket.roomname = room;
    }

    function getRoomname() {
      var room = socket.roomname;
      return room;
    }

    function emitMessage(type, message) {
      // ----- multi room ----
      var roomname = getRoomname();

      if (roomname) {
        //console.log('===== message broadcast to room -->' + roomname);
        socket.broadcast.to(roomname).emit(type, message);
      }
      else {
        console.log('===== message broadcast all');
        socket.broadcast.emit(type, message);
      }
    }

    // When a user send a SDP message
    // broadcast to all users in the room
    socket.on('message', function(message) {
        var date = new Date();
        message.from = socket.id;
        //console.log(date + 'id=' + socket.id + ' Received Message: ' + JSON.stringify(message));

        // get send target
        var target = message.sendto;
        if (target) {
          //console.log('===== message emit to -->' + target);
          socket.to(target).emit('message', message);
          return;
        }

        // broadcast in room
        emitMessage('message', message);
    });

    // When the user hangs up
    // broadcast bye signal to all users in the room
    socket.on('disconnect', function() {
        // close user connection
        console.log((new Date()) + ' Peer disconnected. id=' + socket.id);

        // --- emit ----
        emitMessage('user disconnected', {id: socket.id});

        // --- leave room --
        var roomname = getRoomname();
        if (roomname) {
          socket.leave(roomname);
        }
    });

});