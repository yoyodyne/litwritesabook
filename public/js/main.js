$(function() {
	$("#note").keyup(function(e){
		var op = getChange(oldval,$(this).val());
    if(op){
      $(this).height(0);
      $(this).height( $(this)[0].scrollHeight-10 );
		  socket.emit('changeNote', { id: document.location.href.split("/").pop(), op :op});
		  oldval = $(this).val();
    }
	});
});
var socket = io.connect("ws://"+document.location.hostname+":8000");

socket.on("connect", function() {
        socket.emit('getNote', { id: document.location.href.split("/").pop()});
    }).on("disconnect", function() {
        
    });

socket.on("setNote",function(data){
	oldval = data.note;
	$("#note").val(oldval);
  $("#note").height(0);
  $("#note").height( $("#note")[0].scrollHeight -10);
});

socket.on("changeBackNote",function(data){
  $("#note").attr("readonly","readonly");
  clearTimeout(tout);
	var newval = $("#note").val();
	var op = data.op;
	if(op.d!==null) {
		newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
	}
	if(op.i!==null){
		newval = newval.insert(op.p,op.i);
	} 
	$("#note").val(newval);
  $("#note").height(0);
  $("#note").height( $("#note")[0].scrollHeight-10 );
	oldval = newval;
  tout = setTimeout(function(){
    $("#note").removeAttr("readonly").focus();
  },2000);
});



String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

var op = [],oldval,tout;
var getChange = function(oldval, newval) {
  // Strings are immutable and have reference equality. I think this test is O(1), so its worth doing.
  if (oldval === newval) return null;
  

  var commonStart = 0;
  while (oldval.charAt(commonStart) === newval.charAt(commonStart)) {
    commonStart++;
  }

  op = {p:commonStart,i:null,d:null};

  var commonEnd = 0;
  while (oldval.charAt(oldval.length - 1 - commonEnd) === newval.charAt(newval.length - 1 - commonEnd) &&
      commonEnd + commonStart < oldval.length && commonEnd + commonStart < newval.length) {
    commonEnd++;
  }

  if (oldval.length !== commonStart + commonEnd) {
  	op.d = oldval.length - commonStart - commonEnd;
  }
  if (newval.length !== commonStart + commonEnd) {
  	op.i = newval.slice(commonStart, newval.length - commonEnd);
  }
  return op;
};


