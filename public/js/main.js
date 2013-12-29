$(function() {
	$("#note").keyup(function(e){
		socket.emit('changeNote', { note : $(this).val() });
	});
});

var socket = io.connect();

socket.emit('getNote', { id: document.location.href.split("/").pop()});

socket.on("setNote",function(data){
	// $("#note").off("change");
	// $("#note").val(data.note);
	// $("#note").on("change",function(e){
	// 	socket.emit('changeNote', { note : $(this).val() });
	// });
});

socket.on("changeBackNote",function(data){
	// $("#note").off("change");
	// console.log(data);
	$("#note").val(data.note);
	// $("#note").on("change",function(e){
	// 	socket.emit('changeNote', { note : $(this).val() });
	// });
});
