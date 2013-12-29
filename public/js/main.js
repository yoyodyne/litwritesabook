$(function() {
	$("#create").attr("href",new Date().valueOf().toString(16));
});

var socket = io.connect('http://localhost');
socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});