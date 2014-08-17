$(function() {

  listenEvents();
  
  $('#note').hallo({
    editable:false,
    plugins: {
      'halloformat': {},
      'halloheadings': {},
      'hallolists': {},
      'halloreundo': {}
    },
    toolbar: 'halloToolbarFixed'
  });

  $("#url").val(document.location.href).popover();

  //notif check......
  notif = new Notify("Hello,");
  if(notif.isSupported()){
    if(notif.needsPermission()){
      $("#notif").find("span").text("(off)");
    } else if(!localStorage.notif || localStorage.notif==0){
      $("#notif").find("span").text("(off)");
    } else {
      $("#notif").find("span").text("(on)");
    }
  } else {
    $("#notifier").hide();
  }

  //keep checking window focus.....
  $(window).blur(function(){
    localStorage.windowFocus = 0;
  }).focus(function(){
    localStorage.windowFocus = 1;
  });
  renderSaved();
});

var socket = io("http://"+document.location.hostname+":8080"),notif;

socket.on("connect", function() {
  socket.emit('init', { id: document.location.href.split("/").pop()},function(data){
    var verb = (data.num==1)?" Anon":" Anons";
    $("#status").text(data.num+ verb + " writing");
    oldval = data.note;
    $('#note').hallo({editable: true});
    $("#note").html(oldval);
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
  $('#note').hallo({editable: false});
}).on("connecting",function(){
  $("#status").removeClass("label-success label-danger").addClass("label-warning").text("Connecting..");
});

socket.on("clientChange",function(data){
  var verb = (data.num==1)?" Anon":" Anons";
  $("#status").text(data.num+ verb + " writing");
});

socket.on("changeBackNote",function(data){
  $('#note').hallo({editable: false});
  clearTimeout(tout);
  var newval = $("#note").html();
  var op = data.op;

  if(op.d!==null) {
    newval = newval.slice(0,op.p)+newval.slice(op.p+op.d);
  }
  if(op.i!==null){
    newval = newval.insert(op.p,op.i);
  }
  $("#note").html(newval);
  oldval = newval;
  tout = setTimeout(function(){
    $('#note').hallo({editable: true});
    if(localStorage.notif == 1 && localStorage.windowFocus != 1){
      notif = new Notify("/lit/terature",{
        notifyClick: onNotifyClick,
        "body":"There are new changes in your draft."
      });
      notif.show();
    } 
  },1000);
});


function listenEvents(){
  //$("#note").on("hallomodified",function(e,data){
  //  var op = getChange(oldval,data.content);
  //  if(op){
  //    socket.emit('changeNote', {op :op});
  //    oldval = data.content;
  //  }
  //});
  $("#notif").click(function(){
    if(localStorage.notif == 1){
      $("#notif").find("span").text("(off)");
      localStorage.notif = 0;
    } else {
      notif = new Notify("Hi,",{
        permissionGranted: onNotifyPermission
      });
      if (notif.needsPermission()) {
        notif.requestPermission();
      } else {
        $("#notif").find("span").text("(on)");
      }
      localStorage.notif = 1;
    }
  });
  $("#export").click(function(e){
    var doc = new jsPDF();

    // We'll make our own renderer to skip this editor
    var specialElementHandlers = {
      '#editor': function(element, renderer){
        return true;
      }
    };

    // All units are in the set measurement for the document
    // This can be changed to "pt" (points), "mm" (Default), "cm", "in"
    doc.fromHTML($('#note').parent().get(0), 15, 15, {
      'width': 170, 
      'elementHandlers': specialElementHandlers
    });
    doc.save("litwritesabook - "+document.location.href.split("/").pop()+".pdf");
    //$("#export").attr("href","data:text/html;base64," + btoa($("#note").html()));
    //$("#export").attr("download","livenote - "+document.location.href.split("/").pop()+".html");
    return false;
  });
}


function renderSaved(){
  var saved = JSON.parse((localStorage.urls)? localStorage.urls:"{}");
  $(".panel .list-group").empty();
  for (var url in saved) {
    $(".panel .list-group").append("<li class='list-group-item' style='text-align: center'><a target='_blank' href='"+url+"''>"+saved[url]+"</a><button title='Delete saved URL' class='btn btn-default btn-xs pull-right'><i class='fa fa-trash-o'></i></button></li>");
  };
  if($(".panel .list-group").is(":empty")){
    $(".panel .list-group").html("<li class='text-center list-group-item'>no drafts saved</li>");
  }
}

function onNotifyPermission(){
  $("#notif").find("span").text("(on)");
  //notif.show();
}

function onNotifyClick(){
  $(window).focus();
}

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

var op = [],oldval,tout;
var txtiwrote = "";
var trip = getCookie('trip');
function getChange(oldval, newval) {
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
  txtiwrote += op.i;
  if ( op.i == '.' && txtiwrote != '.') { 
    socket.emit('addCount',{count: txtiwrote.split(' ').length, trip:trip.split('!')[0]});
    txtiwrote = "";
  }
  return op;
};


function getCookie(name)
{
    var arr = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
     if(arr != null) return unescape(arr[2]); return null;
}
