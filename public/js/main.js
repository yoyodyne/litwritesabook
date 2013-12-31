$(function() {
	$("#note").keyup(function(e){
		socket.emit('changeNote', { id: document.location.href.split("/").pop(), note : $(this).val() });
	});
});

var socket = io.connect("ws://"+document.location.hostname+":8000");

socket.emit('getNote', { id: document.location.href.split("/").pop()});

socket.on("setNote",function(data){
	$("#note").val(data.note);
});

socket.on("changeBackNote",function(data){
	$("#note").val(data.note);
});
