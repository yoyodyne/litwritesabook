$(function() {
	$("#note").keyup(function(e){
		socket.emit('changeNote', { id: document.location.href.split("/").pop(), note : $(this).val() });
	});
});
var socket = io.connect("ws://"+document.location.hostname+":8000");

socket.on("connect", function() {
        socket.emit('getNote', { id: document.location.href.split("/").pop()});
    }).on("disconnect", function() {
        
    });

socket.on("setNote",function(data){
	$("#note").val(data.note);
});

socket.on("changeBackNote",function(data){
	$("#note").val(data.note);
});
