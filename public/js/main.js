$(function() {
	$("#note").keyup(function(e){
		socket.emit('changeNote', { id: document.location.href.split("/").pop(), note : $(this).val() });
	});
});
var port = (document.location.port==80)?":8000":":8080"
var socket = io.connect("ws://"+document.location.hostname+port);

socket.emit('getNote', { id: document.location.href.split("/").pop()});

socket.on("setNote",function(data){
	$("#note").val(data.note);
});

socket.on("changeBackNote",function(data){
	$("#note").val(data.note);
});
