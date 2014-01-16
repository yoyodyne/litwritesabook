$(function() {
  $("#note").autosize();
	$("#note").keyup(function(e){
		var op = getChange(oldval,$(this).val());
    if(op){
		  socket.emit('changeNote', {op :op});
		  oldval = $(this).val();
    }
	});
  $("#save").click(function(){
    var urlName = window.prompt("Please enter name for your note. Saved name and URL will be displayed on right side under saved drafts.");
    if(urlName) {
      var urls = JSON.parse((localStorage.urls)? localStorage.urls:"{}");
      urls[document.location.href] = urlName;
      localStorage.urls = JSON.stringify(urls);
      renderSaved();
    }
  });
  $(".panel").on("click",".btn-xs",function(){
    if(confirm("Are you sure you want to delete this saved link?")){
      var urls = JSON.parse(localStorage.urls);
      delete urls[$(this).prev().attr("href")];
      localStorage.urls = JSON.stringify(urls);
      $(this).parent().remove();
      if($(".panel .list-group").is(":empty")){
        $(".panel .list-group").html("<li class='text-center list-group-item'>no drafts saved</li>");
      }
    }
  });
  $("#delete").click(function(){
    if(confirm("Are you sure you want to delete this note?")){
      socket.emit('delNote', {});
      setTimeout(function(){
        window.location = "http://"+document.location.host;
      },500);
    }
  });
  $("#export").click(function(e){
    $("#export").attr("href","data:text/plain;base64," + btoa($("#note").val()));
    $("#export").attr("download","livenote - "+document.location.href.split("/").pop()+".txt")
  });
  $("#url").val(document.location.href).popover();
  renderSaved();
});
var socket = io.connect("ws://"+document.location.hostname+":8000");

socket.on("connect", function() {
        socket.emit('init', { id: document.location.href.split("/").pop()},function(data){
          var verb = (data.num==1)?" client":" clients";
          $("#status").text(data.num+ verb + " connected");
          oldval = data.note;
          $("#note").val(oldval).removeAttr("readonly").trigger('autosize.resize');
          if(!localStorage.urlTip){
            $("#url").popover("show");
            setTimeout(function(){
              $("#url").popover("hide");
            },5000);
            localStorage.urlTip = true;
          }
        });
        $("#status").removeClass("label-danger label-warning").addClass("label-success").text("Connected");
    }).on("disconnect", function() {
        $("#status").removeClass("label-success label-warning").addClass("label-danger").text("Disconnected");
        $("#note").attr("readonly","readonly");
    }).on("connecting",function(){
        $("#status").removeClass("label-success label-danger").addClass("label-warning").text("Connecting..");
    });

socket.on("clientChange",function(data){
  var verb = (data.num==1)?" client":" clients";
  $("#status").text(data.num+ verb + " connected");
});

socket.on("delBackNote",function(data){
  window.location = "http://"+document.location.host;
});

socket.on("changeBackNote",function(data){
  $("#note").attr("readonly","readonly");
  clearTimeout(tout);
	var newval = $("#note").val();
	var op = data.op;

  var pos = $("#note").get(0).selectionStart;

	if(op.d!==null) {
		newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
	}
	if(op.i!==null){
		newval = newval.insert(op.p,op.i);
	}

	$("#note").val(newval).trigger('autosize.resize');
	oldval = newval;
  tout = setTimeout(function(){
    $("#note").removeAttr("readonly").focus();
  },2000);
});


function renderSaved(){
  var saved = JSON.parse((localStorage.urls)? localStorage.urls:"{}");
  $(".panel .list-group").empty();
  for (var url in saved) {
    $(".panel .list-group").append("<li class='list-group-item' style='text-align: center'><a target='_blank' href='"+url+"''>"+saved[url]+"</a><button title='Delete saved URL' class='btn btn-default btn-xs pull-right'><i class='glyphicon glyphicon-trash'></i></button></li>");
  };
  if($(".panel .list-group").is(":empty")){
    $(".panel .list-group").html("<li class='text-center list-group-item'>no drafts saved</li>");
  }
}

$.fn.setCursorPosition = function(pos) {
  this.each(function(index, elem) {
    if (elem.setSelectionRange) {
      elem.setSelectionRange(pos, pos);
    } else if (elem.createTextRange) {
      var range = elem.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  });
  return this;
};

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


