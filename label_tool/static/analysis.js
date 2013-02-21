var LISTENER_LIST = 1,
    KEYBOARD_DATA = 2,
    VIDEODATA_NOD = 3,
    VIDEODATA_SHK = 4,
    VIDEODATA_SML = 5,
    LISTENER_DATA = 6;
var TYPE_HEADNOD = 1,
    TYPE_HEADSHK = 2,
    TYPE_SMILE   = 3;

var speaker_player = null,
    listener_player = null;
var speaker_player_ready = false,
    listener_player_ready = false;
var start_playing = false;

var listener_data = null,
    listener_table= null,
    speaker_data  = null,
    speaker_table = null,
    type_data     = null,
    type_table    = null;
var behavior_type = null;

var cache = {};
var paper_set = {};
var indicator_set = [];
var aux_paper = null;
var aux_paper_number = 0;

var canvas_height = 100;

// YouTube video API related
function onYouTubeIframeAPIReady() {
	speaker_player = new YT.Player('speaker_video_container', {
		width: '350',
		height:'300',
		playerVars: {
			"controls": 0,
		},
		events: {
			'onReady': onSpeakerPlayerReady,
			'onStateChange': onSpeakerPlayerStateChange,
		},
	});

	listener_player = new YT.Player('listener_video_container', {
		width: '350',
		height:'300',
		playerVars: {
			"controls": 0,
		},
		events: {
			'onReady': onListenerPlayerReady,
			'onStateChange': onListenerPlayerStateChange,
		},
	});
}
function onSpeakerPlayerReady() { speaker_player_ready = true; }
function onListenerPlayerReady() { listener_player_ready = true; }
function onSpeakerPlayerStateChange(event) {
	if (event.data == YT.PlayerState.PLAYING) {
		start_playing = true;
	} else if (event.data == YT.PlayerState.PAUSED) {
		start_playing = false;
	} else if (event.data == YT.PlayerState.BUFFERING) {
		start_playing = false;
	} else if (event.data == YT.PlayerState.ENDED) {
		start_playing = false;
	}
}
function onListenerPlayerStateChange() {}

// Video operations
function resumeVideo(player) {
	player.playVideo();
	start_playing = true;
}
function playVideo(player) {
	player.setVolume(100);
	player.seekTo(0);
	player.playVideo();
}
function pauseVideo(player) {
	player.pauseVideo();
	start_playing = false;
}
function seekVideo(player, time) {
	player.seekTo(time, true);
}
function seekVideoPercentage(player, p) {
	seek_to_time = p * videoDuration(player);
	seekVideo(player, seek_to_time);
}
function videoDuration(player) {
	return player.getDuration();
}
function videoCurrentTime(player) {
	return player.getCurrentTime();
}
function loadVideo(player, video_id) {
	player.loadVideoById(video_id);
}
function syncVideos() {
	speaker_percentage = speaker_player.getVideoLoadedFraction();
	listener_percentage= listener_player.getVideoLoadedFraction();
	if (speaker_percentage == undefined || listener_percentage == undefined || speaker_percentage < 0.3 || listener_percentage < 0.3) {
		requestAnimFrame(syncVideos);
	} else {
		seekVideoPercentage(speaker_player, 0);
		seekVideoPercentage(listener_player, 0);
		resumeVideo(speaker_player);
		resumeVideo(listener_player);
	}
}

//////////////////////////////
// Paper related
function currentProgress() {
	if (start_playing) {
		var curr = videoCurrentTime(speaker_player);
		var total= videoDuration(speaker_player);
		var w = $("#kb_paper").width();

		for (i = 0; i < indicator_set.length; ++i)
			indicator_set[i].remove();
		indicator_set.splice(0, indicator_set.length);

		$.each(paper_set, function(key, val){
			var x = Math.round(curr / total * w);
			var str = "M" + x + ",0L" + x + "," + canvas_height;
			var i = val.path(str);
			i.attr({"stroke":"red"});
			indicator_set.push(i);
		});
	}
	requestAnimFrame(currentProgress);
}

function createHistogramWithin(div, dat, paper_id, w, h, content, defmax) {
	$canvas = $("<div>").attr("id", paper_id).css("width", w)
                                             .css("height",h)
                                             .css("border-bottom", "1px solid #CCC")
                                             .css("margin-bottom", "3px");
    $("#" + div).html("");
    $("#" + div).append($canvas);
    var paper = Raphael(document.getElementById(paper_id), w, h);
    paper_set[paper_id] = paper;

    if (dat.length == 0) return;

    var max = 0;
    if (defmax) {
    	max = defmax;
    } else {
    	if (dat.length == 2) {
    		max = 2800;  // MUST be smile data
    	} else {
    		max = dat[0];
    		for (i = 1; i < dat.length; ++i)
    			if (dat[i] > max)
    				max = dat[i];
    	}
    }
    paper.text(200, 10, "max y: " + max);

    if (content)
    	paper.text(800, 10, content)

    // background
    bg = paper.path("M0,0").attr({stroke:"none", opacity:.3});

    // dat is an array, representing the timeline of the video
    if (dat.length == 2) {
    	colors = ["#11ED3D", "#15C"];
    	for(i = 0; i < dat.length; ++i) {
    		x = 0;
    		y = dat[i][0] / max * h;
    		str = "M0," + (h - y);
    		for(j = 1; j < w; ++j) {
    			y = dat[i][Math.round(j * dat[i].length / w)];
    			y = y > max ? max : y;
    			y = y / max * h;
    			str = str + "L" + j + "," + (h - y);
    		}

    		// draw the histogram
    		paper.path(str).attr({"stroke": colors[i], "stroke-width": 2});
    		bg.attr({
    			path: str + "L" + w + "," + h + "L0," + h + "Z",
    			fill: colors[i],
    		});
    	}
    } else {
    	x = 0;
    	y = dat[0] / max * h;
    	str = "M0," + (h - y);
    	for(i = 1; i < w; ++i) {
    		y = dat[Math.round(i * dat.length / w)];
    		y = y > max ? max : y;
    		y = y / max * h;
    		str = str + "L" + i + "," + (h - y);
    	}

    	// draw the histogram
    	paper.path(str).attr({"stroke": "#11ED3D", "stroke-width": 2});
    	bg.attr({
    		path: str + "L" + w + "," + h + "L0," + h + "Z",
    		fill: "#11ED3D",
    	});
	}
}

//////////////////////////////
// Data Pipeline
function _requestVideoDataOfSpeakerVideo(speaker_id, type) {
	canvas_width = $("#kb_paper").width();
	max_height = 28;  // 28 listeners interact with each speaker video
	if (type == TYPE_HEADSHK)
		max_height = undefined;
	else if (type == TYPE_SMILE)
		max_height = 2800;

	if (type == TYPE_HEADNOD && cache[speaker_id] && cache[speaker_id][VIDEODATA_NOD]) {
		dat = cache[speaker_id][VIDEODATA_NOD];
		createHistogramWithin("vid_paper", dat, "vid_paper_videodata", canvas_width, canvas_height, speaker_id + " head nod (video)", max_height);
	} else if (type == TYPE_HEADSHK && cache[speaker_id] && cache[speaker_id][VIDEODATA_SHK]) {
		dat = cache[speaker_id][VIDEODATA_SHK];
		createHistogramWithin("vid_paper", dat, "vid_paper_videodata", canvas_width, canvas_height, speaker_id + " head shake (video)", max_height);
	} else if (type == TYPE_SMILE && cache[speaker_id] && cache[speaker_id][VIDEODATA_SML]) {
		dat = cache[speaker_id][VIDEODATA_SML];
		createHistogramWithin("vid_paper", dat, "vid_paper_videodata", canvas_width, canvas_height, speaker_id + " smile (video)", max_height);
	} else {
		var request_string;
		if (type == TYPE_HEADNOD) {
			request_string = "type=" + VIDEODATA_NOD + "&speaker_id=" + speaker_id;
		} else if (type == TYPE_HEADSHK) {
			request_string = "type=" + VIDEODATA_SHK + "&speaker_id=" + speaker_id;
		} else if (type == TYPE_SMILE) {
			request_string = "type=" + VIDEODATA_SML + "&speaker_id=" + speaker_id;
		} else {
			return;
		}
		$.post(
			base_url + "analysis",
			request_string,
			function(dat) {
				var tag;
				if (cache[speaker_id] == undefined) {
					cache[speaker_id] = {};
				}
				if (type == TYPE_HEADNOD) {
					tag = " head nod (video)";
					cache[speaker_id][VIDEODATA_NOD] = dat;
				} else if (type == TYPE_HEADSHK) {
					tag = " head shake (video)";
					cache[speaker_id][VIDEODATA_SHK] = dat;
				} else if (type == TYPE_SMILE) {
					tag = " smile (video)";
					cache[speaker_id][VIDEODATA_SML] = dat;
				}
				createHistogramWithin("vid_paper", dat, "vid_paper_videodata", canvas_width, canvas_height, speaker_id + tag, max_height);
			},
			"json"
		);
	}
}

function requestVideoDataOfSpeakerVideo() {
	selection = speaker_table.getSelection();
	if (selection.length == 1) {
		speaker_id = speaker_data.getFormattedValue(selection[0].row, 0);
		_requestVideoDataOfSpeakerVideo(speaker_id, behavior_type);
	}
}

function _requestVideoDataOfListenerVideo(coders, speaker_id, type) {
	var paper_name = 'listen_paper';
	if (aux_paper != null)
		paper_name = aux_paper;

	var coder_name;
	if (coders.split("|").length == 1) {
		coder_name = coders;
	} else {
		coder_name = "(user selected)";
	}

	canvas_width = $("#kb_paper").width();
	if (type == TYPE_HEADNOD && cache[coders] && cache[coders][VIDEODATA_NOD]) {
		dat = cache[coders][VIDEODATA_NOD];
		createHistogramWithin(paper_name, dat, "paper_" + paper_name, canvas_width, canvas_height, "head nod " + coder_name);
	} else if (type == TYPE_HEADSHK && cache[coders] && cache[coders][VIDEODATA_SHK]) {
		dat = cache[coders][VIDEODATA_SHK];
		createHistogramWithin(paper_name, dat, "paper_" + paper_name, canvas_width, canvas_height, "head shake " + coder_name);
	} else if (type == TYPE_SMILE && cache[coders] && cache[coders][VIDEODATA_SML]) {
		dat = cache[coders][VIDEODATA_SML];
		createHistogramWithin(paper_name, dat, "paper_" + paper_name, canvas_width, canvas_height, "smile " + coder_name);
	} else {
		var request_string;
		if (type == TYPE_HEADNOD) {
			request_string = "type=" + LISTENER_DATA + "&behavior=" + VIDEODATA_NOD + "&speaker_id=" + speaker_id + "&listeners=" + coders;
		} else if (type == TYPE_HEADSHK) {
			request_string = "type=" + LISTENER_DATA + "&behavior=" + VIDEODATA_SHK + "&speaker_id=" + speaker_id + "&listeners=" + coders;
		} else if (type == TYPE_SMILE) {
			request_string = "type=" + LISTENER_DATA + "&behavior=" + VIDEODATA_SML + "&speaker_id=" + speaker_id + "&listeners=" + coders;
		} else {
			return;
		}
		$.post(
			base_url + "analysis",
			request_string,
			function(dat) {
				var tag;
				if (cache[coders] == undefined) {
					cache[coders] = {};
				}
				if (type == TYPE_HEADNOD) {
					tag = "head nod " + coder_name;
					cache[coders][VIDEODATA_NOD] = dat;
				} else if (type == TYPE_HEADSHK) {
					tag = "head shake " + coder_name;
					cache[coders][VIDEODATA_SHK] = dat;
				} else if (type == TYPE_SMILE) {
					tag = "smile " + coder_name;
					cache[coders][VIDEODATA_SML] = dat;
				}
				createHistogramWithin(paper_name, dat, "paper_" + paper_name, canvas_width, canvas_height, tag);
			},
			"json"
		);
	}
}

function requestVideoDataOfListenerVideo() {
	selection = listener_table.getSelection();
	coders = [];
	for (i = 0; i < selection.length; ++i) {
		var item = selection[i];
		var coder = listener_data.getFormattedValue(item.row, 0);
		coders.push(coder);
	}
	if (coders.length == 0)
		return;

	// concatenate all coders
	var coders_string = "";
	for (i = 0; i < coders.length; ++i) {
		coders_string = coders_string + coders[i];
		if (i < coders.length - 1)
			coders_string = coders_string + "|";
	}

	var speaker_id;
	selection = speaker_table.getSelection();
	if (selection.length == 1) {
		speaker_id = speaker_data.getFormattedValue(selection[0].row, 0);
	} else {
		return;
	}

	_requestVideoDataOfListenerVideo(coders_string, speaker_id, behavior_type);
}

function requestKeyboardData(speaker_id) {
	if (cache[speaker_id] && cache[speaker_id][KEYBOARD_DATA]) {
		w = $("#kb_paper").width();
		dat = cache[speaker_id][KEYBOARD_DATA];
		createHistogramWithin("kb_paper", dat, "kb_paper_keyboard", w, canvas_height, speaker_id + " keyboard", 350);
		return;
	}
	$.post(
		base_url + "analysis",
		"type=" + KEYBOARD_DATA + "&speaker_id=" + speaker_id,
		function(dat) {
			if (dat) {
				w = $("#kb_paper").width();
				createHistogramWithin("kb_paper", dat, "kb_paper_keyboard", w, canvas_height, speaker_id + " keyboard", 350);
				if (cache[speaker_id] == undefined) {
					cache[speaker_id] = {};
				}
				cache[speaker_id][KEYBOARD_DATA] = dat;
			}
		},
		"json"
	);
}

function requestSpeakerVideoList() {
	speaker_video_list = ["4M8tfXK8Y1Y", "xAZ3-QGMWjo", "bfBMc4RDafg", "f7e91xGHQJ8", "f_U76yiaexg", "l_S-RM-8l9w", "qrHqKOkHNME", "UcaYbyw8MZo"];
	speaker_data = new google.visualization.DataTable();
	speaker_data.addColumn('string', 'speaker');
	speaker_data.addRows(speaker_video_list.length);
	for (i = 0; i < speaker_video_list.length; ++i) {
		speaker_data.setCell(i, 0, speaker_video_list[i]);
	}

	speaker_table = new google.visualization.Table(document.getElementById('speaker_table'));
	speaker_table.draw(speaker_data, {showRowNumber:true, height: "200px"});
	google.visualization.events.addListener(speaker_table, 'select', function() {
		selection = speaker_table.getSelection();
		if (selection.length > 1) {
			return;
		} else if (selection.length == 1) {
			var speaker_id = speaker_data.getFormattedValue(selection[0].row, 0);
			requestListenerVideoList(speaker_id);
			requestKeyboardData(speaker_id);
			requestVideoDataOfSpeakerVideo();
			loadVideo(speaker_player, speaker_id);
			playVideo(speaker_player);

			listener_player.stopVideo();
			$("#listen_paper").html("");
		}
	});
}

// personality data source.
var listener_personality = {};
function renderListenerList(data) {
	if (!listener_data) {
		listener_data = new google.visualization.DataTable();
		listener_data.addColumn('string', 'listener');
		listener_data.addColumn('number', 'attr');
	}
	// Iterate
	current_listener_set = []
	for (var listener_index in data) {
		var _attr = {}
		var _listener = "";
		for (var key in data[listener_index]) {
			if (key == 'listener_name') {
				_listener = data[listener_index][key];
			} else {
				_attr[key]= data[listener_index][key];
			}
		}
		listener_personality[_listener] = _attr;
		current_listener_set.push(_listener);
	}
	// Refresh the listener table.
	row_num = listener_data.getNumberOfRows();
	listener_data.removeRows(0, row_num);
	listener_data.addRows(current_listener_set.length);

	for (i = 0; i < current_listener_set.length; ++i) {
		listener_data.setCell(i, 0, current_listener_set[i]);
		listener_data.setCell(i, 1, listener_personality[current_listener_set[i]]["extroversion"]);
	}
	if (!listener_table) {
		listener_table = new google.visualization.Table(document.getElementById('listener_table'));
		google.visualization.events.addListener(listener_table, 'select', function(){
			requestVideoDataOfListenerVideo();
			// Plays both speaker and listener videos.
			selection = listener_table.getSelection();
			if (selection.length == 1) {
				listener_id = listener_data.getFormattedValue(selection[0].row, 0);
				selection = speaker_table.getSelection();
				if (selection.length == 1) {
					speaker_id = speaker_data.getFormattedValue(selection[0].row, 0);
					loadVideo(listener_player,listener_id);
					loadVideo(speaker_player, speaker_id);
					syncVideos();
				}
			} else {
				listener_player.stopVideo();
			}
		});
	}
	listener_table.draw(listener_data, {showRowNumber:true, height:"300px"});

	// show personality select
	$("#attr").parent().show();
}

function requestListenerVideoList(speaker_id) {
	if (cache[speaker_id] && cache[speaker_id][LISTENER_LIST]) {
		renderListenerList(cache[speaker_id][LISTENER_LIST]);
	} else {
		$.post(
			base_url + "analysis",
			"type=" + LISTENER_LIST + "&speaker_id=" + speaker_id,
			function(dat) {
				if (dat) {
					renderListenerList(dat);
					if (cache[speaker_id] == undefined) {
						cache[speaker_id] = {};
					}
					cache[speaker_id][LISTENER_LIST] = dat;
				}
			},
			"json"
		);
	}
}

function requestBehaviorTypeList() {
	types = ["headnod", "headshake1", "smile"];
	type_data = new google.visualization.DataTable();
	type_data.addColumn('string', 'type');
	type_data.addRows(types.length);
	for (i = 0; i < types.length; ++i) {
		type_data.setCell(i, 0, types[i]);
	}

	type_table = new google.visualization.Table(document.getElementById('type_table'));
	type_table.draw(type_data, {showRowNumber:true, height:"100px"});
	type_table.setSelection([{row:0, column:null}]);
	behavior_type = TYPE_HEADNOD;
	google.visualization.events.addListener(type_table, 'select', function() {
		selection = type_table.getSelection();
		if (selection.length > 1) {
			return;
		} else if (selection.length == 1) {
			var selected_type = type_data.getFormattedValue(selection[0].row, 0);
			if (selected_type == 'headnod') {
				behavior_type = TYPE_HEADNOD;
			} else if (selected_type == 'headshake1') {
				behavior_type = TYPE_HEADSHK;
			} else if (selected_type == 'smile') {
				behavior_type = TYPE_SMILE;
			}
			requestVideoDataOfSpeakerVideo();
			requestVideoDataOfListenerVideo();
		}
	});
}

google.load('visualization', '1', {packages:['table']});
google.setOnLoadCallback(function() {
	requestSpeakerVideoList();
	requestBehaviorTypeList();
});

//////////////////////////////
// key event
function keyDown(evt) {
	if (evt.keyCode != 84)  // press t
		return;
	if (start_playing) {
		pauseVideo(speaker_player);
		pauseVideo(listener_player);
	} else {
		resumeVideo(speaker_player);
		resumeVideo(listener_player);
	}
	window.onkeydown = function(evt) {};
}

function keyUp(evt) {
	if (evt.keyCode != 84)
		return;
	window.onkeydown = function(evt) {
		keyDown(evt);
	};
}

function userSeekVideo(evt) {
	var x0 = $("#kb_paper").position().left;
	var x1 = evt.pageX;
	var w  = $("#kb_paper").width();
    seekVideoPercentage(speaker_player, (x1-x0) / w);
    resumeVideo(speaker_player);
    if (listener_table.getSelection().length == 1) {
    	seekVideoPercentage(listener_player, (x1-x0) / w);
    	resumeVideo(listener_player);
	}
}

//////////////////////////////
// Entry point
$(document).ready(function(){
	window.requestAnimFrame = (function(){
		return window.requestAnimationFrame      ||
		       window.webkitRequestAnimationFrame||
		       window.mozRequestAnimationFrame   ||
		       window.oRequestAnimationFrame     ||
		       window.msRequestAnimationFrame    ||
		       function (callback) {
		       	window.setTimeout(callback, 1000/30);
		       };
	})();

	requestAnimFrame(currentProgress);

	window.onkeydown = function(evt) { keyDown(evt); }
	window.onkeyup = function(evt) { keyUp(evt); }

	$("#kb_paper").click(function(evt)     { userSeekVideo(evt); });
	$("#vid_paper").click(function(evt)    { userSeekVideo(evt); });
	$("#listen_paper").click(function(evt) { userSeekVideo(evt); });
	$("#new_canvas").click(function() {
		aux_paper = "aux" + aux_paper_number;
		aux_paper_number = aux_paper_number + 1;
		$("#kb_paper").parent().append(
			$("<div>").attr("id", aux_paper).css({
				"clear" : "both",
				"margin": "10px 0 0 0",
			})
		);
		return false;
	});
	$("#clr_canvas").click(function() {
		for (i = 0; i < aux_paper_number; ++i) {
			$("#aux" + i).remove();
		}
		aux_paper_number = 0;
		aux_paper = null;
		return false;
	});
	$("#attr").change(function() {
		attr = $("#attr option:selected").val();
		if (listener_data) {
			row_num = listener_data.getNumberOfRows();
			for (i = 0; i < row_num; ++i) {
				listener_name = listener_data.getValue(i, 0);
				listener_data.setCell(i, 1, listener_personality[listener_name][attr]);
			}
			listener_table.draw(listener_data, {showRowNumber:true,height:"300px"});
		}
	});
});