
var player = null;

// whether the HTML5 player is ready
var player_ready = false;
// whether enough data has been loaded
var ready_to_play = false;
// whether the video has started playing
var start_playing = false;
// whether the user presses ctrl, used to modify labels
var mouse_down  = false;
var alt_pressed = false;

// called whenever a new video gets loaded
function startSession() {
	updateMask("Press space bar to load video");
}
// called whenever a video finishes playing
function endSession() {
	ready_to_play = false;
	start_playing = false;
}
// update the text displayed on the mask.
function updateMask(content) {
	if (content) {
		$("#mask").show();
		$("#info span").html(content);
	} else {
		$("#mask").hide();
	}
}

// create paper to draw timeline
var timeline_paper = null;
var timeline_indicator = null;
var user_label_id = 0;
var user_labels = [];
var label_start = false;
function compareLabelBoundary(x) {
	// to find whether the mouse is near the boundary of label.
	GAP = 4;
	res = {};
	wid = $("#timeline_container").width();

	duration = videoDuration();
	for (i = 0; i < user_labels.length; ++i) {
		beg = parseFloat(user_labels[i].data("start"));
		end = parseFloat(user_labels[i].data("end"));
		beg_x = (beg / duration) * wid;
		end_x = (end / duration) * wid;
		if (Math.abs(x - beg_x) <= GAP) {
			res["label"] = user_labels[i];
			res["boundary"] = "L";
			return res;
		}
		if (Math.abs(x - end_x) <= GAP) {
			res["label"] = user_labels[i];
			res["boundary"] = "R";
			return res;
		}
	}
	return res;
}

var ready_to_edit = false;
var label_to_edit = null;
function updateLabelTable(label) {
	var canvas_width = $("#timeline_container").width();

	user_label = $('.user_label_entry[user_label_id="' + label.label.data("id") + '"]');
	user_label.css("text-decoration", "underline");  // mark the updated label.
	user_label_values = user_label.find(".user_label_entry_span");

	beg = label.label.attr("x");
	end = label.label.attr("x") + label.label.attr("width");
	beg = (beg / canvas_width) * videoDuration();
	end = (end / canvas_width) * videoDuration();
	// update the timing information
	label.label.data("start", beg);
	label.label.data("end", end);

	$(user_label_values[0]).text(beg.toFixed(3));
	$(user_label_values[1]).text(end.toFixed(3));
}
function editLabel(x) {
	if (ready_to_edit && label_to_edit) {
		if (label_to_edit.boundary == "L") {
			origin_x = label_to_edit.label.attr("x");
			origin_w = label_to_edit.label.attr("width");
			label_to_edit.label.attr("x", x);
			label_to_edit.label.attr("width", origin_w - (x - origin_x));
		} else if (label_to_edit.boundary == "R") {
			label_to_edit.label.attr("width", x - res.label.attr("x"));
		}
		updateLabelTable(label_to_edit);
		return;
	}

	res = compareLabelBoundary(x);  // find whether the mouse is near to the boundary of label.
	if (res.label != undefined) {
		$("#timeline_container").css("cursor", "col-resize");
		if (mouse_down) {  // user moves the mouse to the boundary and press the button
			ready_to_edit = true;
			label_to_edit = res;
		}
	} else {
		$("#timeline_container").css("cursor", "pointer");
	}
}
function checkTimeWithinLabels(t) {
	found = false;
	for (i = 0; i < user_labels.length; ++i) {
		if (user_labels[i].data("end")) {
			beg = parseFloat(user_labels[i].data("start"));
			end = parseFloat(user_labels[i].data("end"));
			if (beg <= t && t <= end) {
				found = true;
				break;
			}
		}
	}
	return found;
}
function clearPaper() {
	for (i = 0; i < user_labels.length; ++i) {
		user_labels[i].remove();
	}
	user_labels.splice(0, user_labels.length);
}
function createPaper() {
	w = $("#timeline_container").width();
	h = $("#timeline_container").height();
	timeline_paper = Raphael(document.getElementById("timeline_container"), w, h);
	background = timeline_paper.rect(0, 0, w, h).attr({"fill":"#FFF"});

	background.mousemove(function(evt) {
		editLabel(evt.layerX);
	});
	background.mousedown(function(evt) {
		mouse_down = true;
	});
	background.mouseup(function(evt) {
		mouse_down = false;
		if (!ready_to_edit) {
			seekVideoPercentage(evt.layerX / w);
			resumeVideo();
		}
		ready_to_edit = false;
		label_to_edit = null;
	});
}
function drawTimeline(x) {
	if (timeline_indicator) timeline_indicator.remove();
	var canvas_height = $("#timeline_container").height();
	var str = "M" + x + ",0L" + x + "," + canvas_height;
	if (timeline_paper) {
		timeline_indicator = timeline_paper.path(str);
		timeline_indicator.attr({"stroke": "red"});
	}
}
function drawUserLabel(x) {
	if (label_start) {
		var x0 = user_labels[user_labels.length - 1].attr("x");
		user_labels[user_labels.length - 1].attr("width", x - x0);
	}
}
function updateTimelineIndicator() {
	var curr  = videoCurrentTime();
	var total = videoDuration();
	var percent = curr / total;
	var canvas_width = $("#timeline_container").width();
	drawTimeline(canvas_width * percent);
	drawUserLabel(canvas_width * percent);

	// highlight when labels are played
	if (checkTimeWithinLabels(curr))
		$("#video_container").css("border", "4px solid #0B9E1C");
	else
		$("#video_container").css("border", "4px solid #CCC");

	if (ready_to_play == true)
		requestAnimFrame(updateTimelineIndicator);

	$("#currenttime").text(videoCurrentTime().toFixed(2));
}
function startDrawingLabel() {
	var t = videoCurrentTime();
	var percent = t / videoDuration();
	var canvas_width = $("#timeline_container").width();
	var canvas_height = $("#timeline_container").height();
	
	var _user_label = timeline_paper.rect(percent * canvas_width, 0, 0, canvas_height);
	_user_label.attr({"fill":"#4486F6", "stroke":"#B1C9ED", "fill-opacity":0.7});
	_user_label.data("start", t);
	_user_label.data("id", user_label_id);
	
	_user_label.mousemove(function(evt) {
		editLabel(evt.layerX);
	});
	_user_label.mousedown(function(evt) {
		mouse_down = true;
	});
	_user_label.mouseup(function(evt) {
		mouse_down = false;
		if (!ready_to_edit) {
			seekVideoPercentage(evt.layerX / $("#timeline_container").width());
			resumeVideo();
		}
		ready_to_edit = false;
		label_to_edit = null;
	});

	user_labels.push(_user_label);
	user_label_id = user_label_id + 1;

	label_start = true;
}
function stopDrawingLabel() {
	var t = videoCurrentTime();
	if (user_labels.length > 0) {
		user_labels[user_labels.length - 1].data("end", t);
	}
	label_start = false;
}

///////////////////////////////
// youtube player event handler
function onStateChangeHandler(event) {
	if (event.data == YT.PlayerState.PLAYING) {
		if (run_play_until) {
			if (play_segment_beg > 0 && play_segment_end > play_segment_beg) {
				timeout = (play_segment_end - play_segment_beg) * 1000;
				play_back_speed = retrievePlaybackRate();
				play_segment_beg = play_segment_end = 0;
				run_play_until = false;

				setTimeout(pauseVideo, timeout / play_back_speed);
			}
		}
	} else if (event.data == YT.PlayerState.ENDED) {
		if (start_playing)
			onComplete();
	} else if (event.data == YT.PlayerState.PAUSED) {

	} else if (event.data == YT.PlayerState.BUFFERING) {

	} else if (event.data == YT.PlayerState.CUED) {

	} else if (event.data == -1) {  // unstarted

	}
}
function onPlayerReady(event) {
	player_ready = true;
}
function onComplete() {
	$("#play_speed").parent().show();
	$("#check_finish").show();
	$("#video_control_bar").show();
	$("#video_control_play").click(function(){ resumeVideo(); return false; });
	$("#video_control_stop").click(function(){ pauseVideo(); return false; });

	var info = "<li>You can replay the video starting from any position by clicking on the timeline.</li>" +
		"<li>You can drag on the boundary of each label to modify its position.</li>";
	updateMask(info);
}

// video related operations
// major change -> youtube player
function onYouTubeIframeAPIReady() {
	player = new YT.Player('playercontainer', {
		width: '480',
		height: '320',
		playerVars: {
			"controls": 0  // Do not display controls
		},
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onStateChangeHandler
		}
	});
}
function checkLoadingStatus() {
	var percentage = player.getVideoLoadedFraction();
	if (percentage == undefined || percentage < 0.4) {
		if (percentage != undefined)
			updateMask("Loaded " + (percentage.toFixed(2)*100) + "%");
		requestAnimFrame(checkLoadingStatus);
	} else {
		ready_to_play = true;
		updateMask("Press space bar to start video");
	}
}
function loadVideo(videoId) {
	player.mute();
	player.loadVideoById(videoId);
	updateMask("Loading...");
	requestAnimFrame(checkLoadingStatus);
}
function playVideo() {
	player.setVolume(100);
	player.seekTo(0);
	player.playVideo();

	updateMask(false);
	start_playing = true;
	updateTimelineIndicator();
}
function resumeVideo() {
	player.playVideo();
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
	seek_to_time = p * player.getDuration();
	seekVideo(seek_to_time);
}
function videoDuration() {
	return player.getDuration();
}
function videoCurrentTime() {
	return player.getCurrentTime();
}

// interact with server
var test_code = false;
var test_vidx = "9-RuPL9iN7g";
function requestNextVideo() {
	if (test_code) {
		loadVideo(test_vidx);
		$("#status").attr("videoId", test_vidx);  // assign value to videoId
		return;
	}

	batch = $("#status").attr("batch");
	turkId = $("#status").attr("turkId");
	$.post(
		base_url + "label",
		"batch=" + batch + "&tid=" + turkId,
		function(dat) {
			if (dat.v == "") {
				// Finish labeling all videos
				window.location.href = base_url + "confirm?tid=" + turkId + "&batch=" + batch;
			} else {
				loadVideo(dat.v);
				$("#status").attr("videoId", dat.v);  // assign value to videoId
			}
		},
		"json"
	);
}
function submitLabels() {
	ret_string = "";
	for (i = 0; i < user_labels.length; ++i) {
		beg = user_labels[i].data("start").toFixed(4);
		end = user_labels[i].data("end").toFixed(4);
		ret_string = ret_string + beg + "," + end;
		if (i < user_labels.length - 1)
			ret_string = ret_string + "|";
	}

	$status_div = $("#status");
	$batch = $status_div.attr("batch");
	$turkId = $status_div.attr("turkId");
	$videoId = $status_div.attr("videoId");
	$label_type = $status_div.attr("type");

	$.post(
		base_url + "input",
		"type=" + $label_type + "&vid=" + $videoId + "&tid=" + $turkId + "&batch=" + $batch + "&dat=" + ret_string,
		function(dat) {
			if (dat && dat.v == "null") {
				alert("You have finished all videos. You should not see this page...");
			}
		},
		"json"
	);
}

// user events
function onSpaceDown(evt) {
	if (!player_ready) return;
	if (!start_playing) {
		if (!ready_to_play) {
			requestNextVideo();
		} else {
			seekVideo(0);
			playVideo();
		}
	} else {
		startDrawingLabel();
	}
	window.onkeydown = function(evt) {}
}
function onSpaceUp(evt) {
	window.onkeydown = function(evt) { if (evt.keyCode == 32) onSpaceDown(evt); }
	if (start_playing) {
		stopDrawingLabel();
		updateLabelContainer();
	}
}

// label container
function clearLabelContainer() {
	$("#label_container table").html("");
}
function updateLabelContainer() {
	if (user_labels.length > 0) {
		var beg = user_labels[user_labels.length - 1].data("start");
		var end = user_labels[user_labels.length - 1].data("end");
		var idx = user_labels[user_labels.length - 1].data("id");
		beg = beg.toFixed(3);
		end = end.toFixed(3);

		var entry = $("<tr class='user_label_entry'>").attr("user_label_id", idx)
	    	        .append($("<td class='user_label_entry_span'>").text(beg))
	        	    .append($("<td class='user_label_entry_span'>").text(end))
	            	.append($("<td class='user_label_entry_span'>").append(
	            		$("<a href='#'>").append(
	            			$("<img width='12px' height='12px'>").attr("src", "/static/img/delete.png")
	            		).click(function(){
	            			selected_user_label_id = $(this).parent().parent().attr("user_label_id");
	            			selected_user_label_id = parseInt(selected_user_label_id);
	            			deleteUserLabel(selected_user_label_id);
	            			return false;
	            		})
	            	))
	            	.append($("<td class='user_label_entry_span'>").append(
	            		$("<a href='#'>").append(
	            			$("<img width='24px' height='24px'>").attr("src", "/static/img/play.png")
	            		).click(function(){
	            			selected_user_label_id = $(this).parent().parent().attr("user_label_id");
	            			selected_user_label_id = parseInt(selected_user_label_id);
	            			playUserLabel(selected_user_label_id);
	            			return false;
	            		})
	            	))
	            	.mouseover(function(){
	            		selected_user_label_id = $(this).attr("user_label_id");
	            		selected_user_label_id = parseInt(selected_user_label_id);
	            		emphasizeUserLabel(selected_user_label_id);
	            		$(this).css("text-decoration", "underline");
	            	})
	            	.mouseout(function(){
	            		selected_user_label_id = $(this).attr("user_label_id");
	            		selected_user_label_id = parseInt(selected_user_label_id);
	            		deemphasizeUserLabel(selected_user_label_id);
	            		$(this).css("text-decoration", "");
	            	});

		$("#label_container table").append(entry);

		var y1 = entry.position().top;
		var y0 = $("#label_container tr:eq(0)").position().top;
		var h  = $("#label_container").height();
		if (y1 - y0 > h)
			document.getElementById("label_container").scrollTop = ((y1 - y0) - h) + 50;
	}
}

// interact with user labels
function deleteUserLabel(user_label_id) {
	for (i = 0; i < user_labels.length; ++i) {
		if (parseInt(user_labels[i].data("id")) == user_label_id) {
			user_labels[i].remove();
			user_labels.splice(i, 1);
			break;
		}
	}
	$("table .user_label_entry[user_label_id=" + user_label_id + "]").remove();
}
function playUserLabel(user_label_id) {
	for (i = 0; i < user_labels.length; ++i) {
		if (parseInt(user_labels[i].data("id")) == user_label_id) {
			start = parseFloat(user_labels[i].data("start"));
			end = parseFloat(user_labels[i].data("end"));
			seekVideo(start);
			playUntil(end);
			break;
		}
	}
}
function emphasizeUserLabel(user_label_id) {
	for (i = 0; i < user_labels.length; ++i) {
		if (parseInt(user_labels[i].data("id")) == user_label_id) {
			user_labels[i].attr({"fill":"#0B9E1C"});
			break;
		}
	}
}
function deemphasizeUserLabel(user_label_id) {
	for (i = 0; i < user_labels.length; ++i) {
		if (parseInt(user_labels[i].data("id")) == user_label_id) {
			user_labels[i].attr({"fill":"#4486F6"});
			break;
		}
	}
}

function clean() {
	endSession();
	clearPaper();
	clearLabelContainer();

	$("#play_speed option:eq(1)").attr("selected", "selected");
	$("#play_speed").parent().hide();
	$("#check_finish").hide();
	$("#check_finish :checkbox").removeAttr("checked").next().text("Check it if you think you have finished.");
	$("#submit_label").hide();
	$("#video_control_bar").hide();

	startSession();
}

function retrievePlaybackRate() {
	play_back_speed = $("#play_speed option:selected").attr("value");
	play_back_speed = parseFloat(play_back_speed);
	return play_back_speed;
}

function debug() {
	console.log(mouse_down);
	console.log(alt_pressed);
	setTimeout(debug, 1000 / 5);
}

$(document).ready(function() {
	// check the browser
	if ($.browser.msie) {
		alert("We don't accept Microsoft IE browser. Please use a Chrome or Safari instead.");
		return;
	}
	if ($.browser.opera) {
		alert("We don't accept Opera. Please use a Chrome or Safari instead.");
		return;
	}
	if ($.browser.mozilla) {
		alert("Chrome or Safari would be a better choice, though.");
	}

	$("#check_finish").hide().change(function() {
		if ($("#check_finish :checkbox").is(":checked")) {
			$("#check_finish :checkbox").next().text("Uncheck it if you think you have not finished yet.");
			$("#submit_label").show();
		} else {
			$("#check_finish :checkbox").next().text("Check it if you think you have finished.");
			$("#submit_label").hide();
		}
	});

	$("#submit_label").hide().click(function() {
		submitLabels();
		clean();
	});

	window.onkeydown = function(evt) {
		if (evt.keyCode == 18)  // Alt
			alt_pressed = true;
		else if (evt.keyCode == 32)
			onSpaceDown(evt);
	}
	window.onkeyup = function(evt) {
		if (evt.keyCode == 18)  // Alt
			alt_pressed = false;
		else if (evt.keyCode == 32)
			onSpaceUp(evt);
	}

	$("#play_speed option:eq(1)").attr("selected", "selected");

	$("#play_speed").change(function () {
		play_back_speed = retrievePlaybackRate();
		player.setPlaybackRate(play_back_speed);
	});

	startSession();

	createPaper();

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

    // setTimeout(debug, 1000 / 5);
});