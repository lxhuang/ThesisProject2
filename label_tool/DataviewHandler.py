#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database
import json

class Type:
	CODERLIST = 0
	VIDEOLIST = 1
	DATA      = 2

class DataviewHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		self.render("dataview.html")

	def post(self):
		t = self.get_argument("type", None)
		if not t:
			return None
		t = int(t)

		# query video list
		if t == Type.VIDEOLIST:
			try:
				videos = self.db.query("SELECT distinct video_id FROM label_video_data")
				self.write( json.dumps(videos) )
			except Exception, exception:
				print "Fails in querying video list"
				print exception
		# query coder list
		elif t == Type.CODERLIST:
			video = self.get_argument("video", None)
			label_type = self.get_argument("label_type", None)
			if not video or not label_type:
				return None
			try:
				coders = self.db.query("SELECT turk_id FROM label_video_data WHERE video_id = %s AND type = %s", video, label_type)
				self.write( json.dumps(coders) )
			except Exception, exception:
				print "Fails in querying coder list"
				print exception

		# query coder data
		elif t == Type.DATA:
			video = self.get_argument("video", None)
			turks = self.get_argument("turks", None)
			label_type = self.get_argument("label_type", None)
			if (not video) or (not turks) or (not label_type):
				return None

			try:
				blocks = []
				turker_array = turks.split("|")
				for turker in turker_array:
					label = self.db.query("SELECT labels FROM label_video_data WHERE video_id = %s AND type = %s AND turk_id = %s", video, label_type, turker)
					label = label[0]["labels"]
					label = label.split("|")
					for l in label:
						[beg, end] = l.split(",")
						new_beg = float(beg)
						new_end = float(end)

						block_length = len(blocks)
						block_index = 0
						while block_index < block_length:
							if new_beg >= blocks[block_index]["end"]:
								block_index = block_index + 1
							elif new_end <= blocks[block_index]["beg"]:
								new_block = {"beg": new_beg, "end": new_end, "h": 1}
								blocks.insert(block_index, new_block)
								break
							elif new_beg >= blocks[block_index]["beg"]:
								if new_end <= blocks[block_index]["end"]:
									old_end = blocks[block_index]["end"]
									blocks[block_index]["end"] = new_beg
									blocks.insert(block_index + 1, {"beg": new_beg, "end": new_end, "h": blocks[block_index]["h"] + 1})
									blocks.insert(block_index + 2, {"beg": new_end, "end": old_end, "h": blocks[block_index]["h"]})
									break
								elif new_end >= blocks[block_index]["end"]:
									old_end = blocks[block_index]["end"]
									blocks[block_index]["end"] = new_beg
									blocks.insert(block_index + 1, {"beg": new_beg, "end": old_end, "h": blocks[block_index]["h"] + 1})
									new_beg = old_end
									block_index = block_index + 2
							elif new_beg <= blocks[block_index]["beg"]:
								if new_end <= blocks[block_index]["end"]:
									old_beg = blocks[block_index]["beg"]
									old_end = blocks[block_index]["end"]
									blocks[block_index]["beg"] = new_beg
									blocks[block_index]["end"] = old_beg
									blocks.insert(block_index + 1, {"beg": old_beg, "end": new_end, "h": blocks[block_index]["h"] + 1})
									blocks.insert(block_index + 2, {"beg": new_end, "end": old_end, "h": blocks[block_index]["h"]})
									break
								elif new_end >= blocks[block_index]["end"]:
									old_beg = blocks[block_index]["beg"]
									old_end = blocks[block_index]["end"]
									blocks[block_index]["beg"] = new_beg
									blocks[block_index]["end"] = old_beg
									blocks.insert(block_index + 1, {"beg": old_beg, "end": old_end, "h": blocks[block_index]["h"] + 1})
									new_beg = old_end
									block_index = block_index + 2
						if block_index == block_length:
							new_block = {"beg": new_beg, "end": new_end, "h": 1}
							blocks.append(new_block)
				self.write( json.dumps(blocks) )
			except Exception, exception:
				print "Fails in querying label data"
				print exception
		# default
		else:
			return None


