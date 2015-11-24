//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];
var games = [];

io.on('connection', function (socket) {
    //messages.forEach(function (data) {
    //  socket.emit('message', data);
    //});

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name.name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (data) {
      //console.log('ident data '+data);
      if (!data.name){
        data.name = 'Anonymous';
      }
      socket.set('name', data, function (err) {
        updateRoster();
      });
    });
    
    socket.on('mancalachallenge', function(data) {
      var topush = {};
      topush[data.myID] = data.otherID;
      games.push(topush);
      async.map(
        sockets,
        function (socket, callback) {
          socket.get('name', callback);
        },
        function (err, names) {
          //console.log(err);
          //console.log(names);
          var starter = Math.random() >= 0.5 ? -1 : 1;
          for (var i = names.length - 1; i >= 0; i--) {
            if (names[i].ID == data.myID){
              sockets[i].emit('mancalacreate', {firstPlayerName: data.myName, firstPlayerID: data.myID, secondPlayerName: data.otherName, secondPlayerID: data.otherID, starter: starter});
            } else if (names[i].ID == data.otherID){
              sockets[i].emit('mancalacreate', {firstPlayerName: data.myName, firstPlayerID: data.myID, secondPlayerName: data.otherName, secondPlayerID: data.otherID, starter: starter});
            }
          }
        }
      );
    });
    
    socket.on('mancaladomove', function(data) {
      console.log('move: '+data);
      broadcast('mancalamove', data);
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      //console.log(err);
      //console.log(names);
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
