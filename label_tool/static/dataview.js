
var TYPE_CODERLIST = 0,
    TYPE_VIDEOLIST = 1,
    TYPE_DATA = 2;

var player = null;
var player_ready  = false;
var ready_to_play = false;
var start_playing = false;

var current_selected_type = "";
var current_selected_vidx = "";

function updateMask(content) {
	if (content) {
		$("#mask").show();
		$("#info span").html(content);
	} else {
		$("#mask").hide();
	}
}

// video related
function onYouTubeIframeAPIReady() {
	player = new YT.Player('playercontainer', {
		width: '300',
		height:'300',
		playerVars: {
			"controls": 0  // Do not display controls
		},
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onStateChangeHandler
		}
	});
}
function onPlayerReady() {
	player_ready = true;
}
function onStateChangeHandler(event) {
	if (event.data == YT.PlayerState.PLAYING) {
		if (run_play_until) {
			if (play_segment_beg > 0 && play_segment_end > play_segment_beg) {
				timeout = (play_segment_end - play_segment_beg) * 1000;
				play_back_speed = videoPlaybackRate();
				play_segment_beg = play_segment_end = 0;
				run_play_until = false;
				setTimeout(pauseVideo, timeout / play_back_speed);
			}
		}
	} else if (event.data == YT.PlayerState.ENDED) {
		if (start_playing)
			updateMask("The End");
	} else if (event.data == YT.PlayerState.PAUSED) {

	} else if (event.data == YT.PlayerState.BUFFERING) {

	} else if (event.data == YT.PlayerState.CUED) {

	} else if (event.data == -1) {  // unstarted

	}
}
function checkLoadingStatus() {
	var percentage = player.getVideoLoadedFraction();
	if (percentage == undefined || percentage < 0.4) {
		if (percentage != undefined) {
			updateMask("Loaded " + (percentage.toFixed(2)*100) + "%");
		}
		requestAnimFrame(checkLoadingStatus);
	} else {
		updateMask("Ready");
		ready_to_play = true;

		$("#video_control_bar").show();
	}
}
function loadVideo(videoId) {
	player.mute();
	player.loadVideoById(videoId);
	requestAnimFrame(checkLoadingStatus);
}
function playVideo() {
	player.setVolume(100);
	player.seekTo(0);
	player.playVideo();
	start_playing = true;
	updateMask(false);
}
function resumeVideo() {
	player.playVideo();
	start_playing = true;
	updateMask(false);
}
function pauseVideo() {
	player.pauseVideo();
}
var play_segment_beg = 0;
var play_segment_end = 0;
var run_play_until = false;
function playUntil(time) {
	play_segment_end = time;
	pauseVideo();
	resumeVideo();
	run_play_until = true;
}
function seekVideo(time) {
	play_segment_beg = time;
	player.seekTo(time, true);
}
function seekVideoPercentage(p) {
	seek_to_time = p * videoDuration();
	seekVideo(seek_to_time);
}
function videoDuration() {
	return player.getDuration();
}
function videoCurrentTime() {
	return player.getCurrentTime();
}
function videoPlaybackRate() {
	return player.getPlaybackRate();
}

///////////////////////
// google table related
function onSelectType(t) {
	current_selected_type = t;
	$("#label_type").text(t);

	// request the coder list
	if (current_selected_type != "" && current_selected_vidx != "")
		requestCoderList(current_selected_vidx, current_selected_type);
}
function waitUntilMetaLoaded() {
	if (videoDuration() == 0) {
		setTimeout(waitUntilMetaLoaded, 200);
	} else {
		// request the coder list
		if (current_selected_type != "" && current_selected_vidx != "")
			requestCoderList(current_selected_vidx, current_selected_type);
	}
}
function onSelectVideo(video_id) {
	if (!player_ready) {
		alert("HTML5 player is not ready yet.");
		return;
	}

	// reset the video controller
	ready_to_play = false;
	start_playing = false;
	$("#video_control_bar").hide();
	
	current_selected_vidx = video_id;
	// loading the video
	loadVideo(video_id);

	setTimeout(waitUntilMetaLoaded, 1000);
}
function requestTypeList() {
	types = ["headnod", "headshake", "headshake1", "smile", "eyebrow"];
	type_data = new google.visualization.DataTable();
	type_data.addColumn("string", "type");
	type_data.addRows(4);
	for (i = 0; i < 4; ++i) {
		type_data.setCell(i, 0, types[i]);
	}

	type_table = new google.visualization.Table(document.getElementById("typetable"));
	type_table.draw(type_data, {showRowNumber: true, height: "120px", width: "200px"});
	google.visualization.events.addListener(type_table, 'select', function() {
		selection = type_table.getSelection();
		if (selection.length > 1) {
			alert("You can only select one type at one time.");
			return;
		} else if (selection.length == 1) {
			var t = type_data.getFormattedValue(selection[0].row, 0);
			onSelectType(t);
		} else if (selection.length == 0) {
			onSelectType("");
		}
	});
}
function requestVideoList() {
	$.post(
		base_url + "view_data",
		"type=" + TYPE_VIDEOLIST,
		function(dat) {
			video_data = new google.visualization.DataTable();
			video_data.addColumn("string", "video_id");
			video_data.addRows(dat.length);
			for (i = 0; i < dat.length; ++i) {
				var video_id = dat[i]["video_id"];
				video_data.setCell(i, 0, video_id);
			}

			video_table = new google.visualization.Table(document.getElementById("videotable"));
			video_table.draw(video_data, {showRowNumber: true, height: "200px", width: "200px"});
			google.visualization.events.addListener(video_table, 'select', function() {
				selection = video_table.getSelection();
				if (selection.length > 1) {
					alert("You can only select one video at one time.");
					return;
				} else if (selection.length == 1) {
					var video_id = video_data.getFormattedValue(selection[0].row, 0);
					onSelectVideo(video_id);
				}
			});
		},
		"json"
	);
}
var coder_data = null;
var coder_table = null;
function requestCoderList(video_id, type) {
	clearPapers();
	$.post(
		base_url + "view_data",
		"type=" + TYPE_CODERLIST + "&video=" + video_id + "&label_type=" + type,
		function(dat) {
			all_coder_array = [];

			if (coder_data) {
				row_number = coder_data.getNumberOfRows();
				coder_data.removeRows(0, row_number);
			} else {
				coder_data = new google.visualization.DataTable();
				coder_data.addColumn("string", "coder_id");
			}

			coder_data.addRows(dat.length);
			for (i = 0; i < dat.length; ++i) {
				var coder_id = dat[i];
				all_coder_array.push(coder_id);
				coder_data.setCell(i, 0, coder_id);
			}
			if (coder_table == null) {
				coder_table = new google.visualization.Table(document.getElementById("codertable"));
				google.visualization.events.addListener(coder_table, 'select', function() {
					coder_array = [];
					selection = coder_table.getSelection();
					for (i = 0; i < selection.length; ++i)
						coder_array.push(coder_data.getFormattedValue(selection[i].row, 0));
					requestCodersData(current_selected_vidx, coder_array, current_selected_type);
				});
			}
			coder_table.draw(coder_data, {showRowNumber: true, height: "300px", width: "200px"});
			requestCodersData(video_id, all_coder_array, type);
		},
		"json"
	);
}
function requestCodersData(video_id, turk_ids, type) {
	turk_str = "";
	for (i = 0; i < turk_ids.length; ++i) {
		if (turk_str != "")
			turk_str = turk_str + "|";
		turk_str = turk_str + turk_ids[i];
	}
	if (turk_str == "") return;

	$.post(
		base_url + "view_data",
		"type=" + TYPE_DATA + "&video=" + video_id + "&turks=" + turk_str + "&label_type=" + type,
		function(dat) {
			content = "";
			w = $("#view").width();
			if (turk_str.indexOf("|") == -1) content = turk_str;
			createHistogram(dat, "data_view" + paper_set.length, w, paper_height, content);
		},
		"json"
	);
}

// paper related
var paper_set = [];
var indicator_set = [];
var paper_height = 100;
function createHistogram(dat, paper_id, w, h, content) {
	$child_canvas = $("<div>").attr("id", paper_id).css("width",  w)
	                                               .css("height", h)
	                                               .css("border-bottom", "1px solid #CCC")
	                                               .css("margin-bottom", "5px");
	$("#view").append($child_canvas);

	// create a raphael paper
	var paper = Raphael(document.getElementById(paper_id), w, h);
	paper_set.push(paper);
	
	$("#"+paper_id).click(function(evt) {
		x = evt.pageX - $("#"+paper_id).offset().left;
		seekVideoPercentage(x / w);
		resumeVideo();
	});

	// get the max height
	var max_height = 0;
	var len = dat.length;
	if (len == 0) return;

	for (i = 0; i < len; ++i) {
		if (dat[i]["h"] > max_height)
			max_height = dat[i]["h"];
	}

	var duration = videoDuration();
	for (i = 0; i < len; ++i) {
		hh = dat[i]["h"] / max_height * h;
		ww = (dat[i]["end"] - dat[i]["beg"]) / duration * w;
		x0 = dat[i]["beg"] / duration * w;
		y0 = h - hh;
		r = paper.rect(x0, y0, ww, hh);
		r.attr({"fill": "#11ED3D", "stroke": "none"});
		r.click(function(evt) {
			seekVideoPercentage(evt.layerX / w);
			resumeVideo();
		});
	}

	// print the paper ID
	paper.text(350, 10, paper_id);
	// print content
	if (content != "")
		paper.text(w-100, 10, content);
}
function clearPapers() {
	$("#view").html("");
	if (paper_set.length > 0) {
		for (i = 0; i < paper_set.length; ++i)
			paper_set[i].remove();
		paper_set.splice(0, paper_set.length);
	}
}

function drawTimeline(x) {
	for (i = 0; i < indicator_set.length; ++i)
		indicator_set[i].remove();
	indicator_set.splice(0, indicator_set.length);
	
	var str = "M" + x + ",0L" + x + "," + paper_height;
	for (i = 0; i < paper_set.length; ++i) {
		timeline_indicator = paper_set[i].path(str);
		timeline_indicator.attr({"stroke": "red"});
		indicator_set.push(timeline_indicator);
	}
}
function updateTimelineIndicator() {
	if (start_playing) {
		$("#currenttime").text(videoCurrentTime().toFixed(2));
		var curr  = videoCurrentTime();
		var total = videoDuration();
		var percent = curr / total;
		var canvas_width = $("#view").width();
		drawTimeline(canvas_width * percent);
	}
	requestAnimFrame(updateTimelineIndicator);
}

///////////////////
// Entry point
google.load('visualization', '1', {packages:['table']});
google.setOnLoadCallback(function() {
	requestTypeList();
	requestVideoList();
});

$(document).ready(function(){
	$("#video_control_play").click(function(){ playVideo(); return false; });
	$("#video_control_stop").click(function(){ pauseVideo(); return false; });
	$("#video_control_resm").click(function(){ resumeVideo(); return false; });

	// playback speed
	$("#play_speed option:eq(1)").attr("selected", "selected");
	$("#play_speed").change(function () {
		play_back_speed = $("#play_speed option:selected").attr("value");
		play_back_speed = parseFloat(play_back_speed);
		player.setPlaybackRate(play_back_speed);
	});

	$("#clear_paper").click(function () {
		clearPapers();
		return false;
	});

	// shim layer with setTimeout fallback
    window.requestAnimFrame = (function(){
      return window.requestAnimationFrame       || 
             window.webkitRequestAnimationFrame || 
             window.mozRequestAnimationFrame    || 
             window.oRequestAnimationFrame      || 
             window.msRequestAnimationFrame     || 
             function( callback ){
             	window.setTimeout(callback, 1000 / 60);
             };
    })();

    updateTimelineIndicator();
});


