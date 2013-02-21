# visualize the keyboard data as well as the video data

import os
import tornado.httpserver
import tornado.web
import tornado.database
import json

from batch import Batch
from coder_agreement import DataSource

def accumulate(blocks, new_beg, new_end):
	block_index  = 0
	block_length = len(blocks)
	while block_index < block_length:
		old_h   = blocks[block_index]["h"]
		old_beg = blocks[block_index]["beg"]
		old_end = blocks[block_index]["end"]

		if new_beg > blocks[block_index]["end"]:
			block_index = block_index + 1

		elif new_end < blocks[block_index]["beg"]:
			new_block = {"beg": new_beg, "end": new_end, "h": 1}
			blocks.insert(block_index, new_block)
			break

		elif new_beg >= blocks[block_index]["beg"]:
			if new_beg == blocks[block_index]["beg"]:
				if new_end < blocks[block_index]["end"]:
					blocks.insert(block_index, {"beg": new_beg, "end": new_end, "h": old_h+1})
					blocks[block_index + 1]["beg"] = new_end
					break
				elif new_end == blocks[block_index]["end"]:
					blocks[block_index]["h"] = old_h+1
					break
				elif new_end > blocks[block_index]["end"]:
					blocks[block_index]["h"] = old_h+1
					block_index = block_index + 1
					new_beg = old_end
			else:
				if new_end < blocks[block_index]["end"]:
					blocks[block_index]["end"] = new_beg
					blocks.insert(block_index + 1, {"beg": new_beg, "end": new_end, "h": old_h+1})
					blocks.insert(block_index + 2, {"beg": new_end, "end": old_end, "h": old_h})
					break
				elif new_end == blocks[block_index]["end"]:
					blocks[block_index]["end"] = new_beg
					blocks.insert(block_index + 1, {"beg": new_beg, "end": old_end, "h": old_h+1})
					break
				elif new_end > blocks[block_index]["end"]:
					blocks[block_index]["end"] = new_beg
					blocks.insert(block_index + 1, {"beg": new_beg, "end": old_end, "h": old_h+1})
					block_index = block_index + 2
					new_beg = old_end

		elif new_beg < blocks[block_index]["beg"]:
			if new_end < blocks[block_index]["end"]:
				blocks.insert(block_index, {"beg": new_beg, "end": old_beg, "h": 1})
				blocks[block_index + 1]["end"] = new_end
				blocks[block_index + 1]["h"]   = old_h+1
				blocks.insert(block_index + 2, {"beg": new_end, "end": old_end, "h": old_h})
				break
			elif new_end == blocks[block_index]["end"]:
				blocks.insert(block_index, {"beg": new_beg, "end": old_beg, "h": 1})
				blocks[block_index + 1]["h"] = old_h+1
				break
			elif new_end > blocks[block_index]["end"]:
				blocks.insert(block_index, {"beg": new_beg, "end": old_beg, "h": 1})
				blocks[block_index + 1]["h"]   = old_h+1
				block_index = block_index + 2
				new_beg = old_end

		block_length = len(blocks)

	if block_index == block_length:
		new_block = {"beg": new_beg, "end": new_end, "h": 1}
		blocks.append(new_block)


class Type:
	LISTENER_LIST = 1
	KEYBOARD_DATA = 2
	VIDEODATA_NOD = 3
	VIDEODATA_SHK = 4
	VIDEODATA_SML = 5
	LISTENER_DATA = 6

class AnalysisHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def load_video_list(self):
		per_speaker = dict()
		video_list_file = os.path.join(os.path.dirname(__file__), "data/video_list.txt")
		fhandler = open(video_list_file, "r")
		lines = fhandler.readlines()
		fhandler.close()
		for line in lines:
			number, listener, speaker = line.strip().split("\t")
			if speaker not in per_speaker:
				per_speaker[speaker] = [listener]
			else:
				per_speaker[speaker].append(listener)
		return per_speaker

	def load_listener_list(self):
		listener_index = dict()
		video_list_file = os.path.join(os.path.dirname(__file__), "data/video_list.txt")
		fhandler = open(video_list_file, "r")
		lines = fhandler.readlines()
		fhandler.close()
		for line in lines:
			number, listener, speaker = line.strip().split("\t")
			listener_index[listener] = int(number)
		return listener_index

	def load_personality(self):
		user_data = dict()
		attributes = [
			"extroversion","agreeableness","conscientiousness","neuroticism",
			"openness","selfconsciousness","otherfocusscale","shyness","selfmonitor"
		]
		personality_file = os.path.join(os.path.dirname(__file__), "data/personality.txt")
		fhandler = open(personality_file, "r")
		lines = fhandler.readlines()
		fhandler.close()
		for line in lines:
			tokens = line.strip().split("\t")
			userid = int(tokens[0].strip())
			user_data[userid] = dict()
			for i in range(0,len(attributes)):
				user_data[userid][attributes[i]] = float(tokens[i+1].strip())
		return user_data

	def load_keyboard_consensus(self, speaker_id):
		result = []
		data_root = os.path.join(os.path.dirname(__file__), "../analysis/data/")
		batch = Batch()
		batch.load(data_root)
		batch._getDataOfVideo(speaker_id, result)
		return result

	def load_headnod(self, speaker_id, listeners):
		data_root = os.path.join(os.path.dirname(__file__), "data/headnod")
		data_source = DataSource()
		data_source.load(data_root)

		blocks = []
		for listener in listeners:
			if listener not in data_source.data_source:
				continue
			listener_data = data_source.data_source[listener]
			for each_coder in listener_data:
				for each_label in each_coder:
					accumulate(blocks, each_label[0], each_label[1])
		return blocks

	def load_headshake(self, speaker_id, listeners):
		data_root = os.path.join(os.path.dirname(__file__), "data/headshake1")
		data_source = DataSource()
		data_source.load(data_root)

		blocks = []
		for listener in listeners:
			if listener not in data_source.data_source:
				continue
			shakes = []
			listener_data = data_source.data_source[listener]
			for each_coder in listener_data:
				for each_label in each_coder:
					accumulate(shakes, each_label[0], each_label[1])
			for shake in shakes:
				if shake["h"] > 1:
					accumulate(blocks, shake["beg"], shake["end"])
		return blocks

	def load_speaker_smile(self, speaker_id):
		data_root = os.path.join(os.path.dirname(__file__), "data/speaker_smile")
		smile_file = os.path.join(data_root, speaker_id + ".txt")
		fhandler = open(smile_file, "r")
		lines = fhandler.readlines()
		fhandler.close()
		smile_data = []
		for line in lines:
			index, level = line.strip().split(" ")
			smile_data.append(int(level))
		return smile_data

	def load_smile(self, speaker_id, listeners):
		smile_data= dict()
		data_root = os.path.join(os.path.dirname(__file__), "data/smile")
		for listener in listeners:
			smile_file = os.path.join(data_root, listener + ".txt")

			fhandler = open(smile_file, "r")
			lines = fhandler.readlines()
			fhandler.close()

			smile_data[listener] = []
			for line in lines:
				index, level = line.strip().split(" ")
				smile_data[listener].append(int(level))
		return smile_data

	def convert_smile_to_histogram(self, smile_data, hist):
		for listener in smile_data:
			for i in xrange(0, len(hist)):
				frame_index = int(round((i * 100) / 1000 * 25))
				if frame_index > len(smile_data[listener]):
					break
				hist[i] = hist[i] + smile_data[listener][frame_index]

	def convert_to_histogram(self, blocks, gap, hist):
		for block in blocks:
			beg = int(round(block["beg"] * 10) - gap)
			end = int(round(block["end"] * 10) - gap)
			for i in range(beg,end+1):
				if i < 0:
					continue
				if i >= len(hist):
					break
				hist[i] = block["h"]

	def get(self):
		self.render("analysis.html")

	def post(self):
		t = self.get_argument("type", None)
		if not t: return

		t = int(t)
		if t == Type.LISTENER_LIST:
			listeners  = []
			speaker_id = self.get_argument("speaker_id", None)
			if not speaker_id:
				return
			listeners_per_speaker = self.load_video_list()
			listeners_index = self.load_listener_list()
			listeners_data = self.load_personality()

			listeners = listeners_per_speaker[speaker_id]
			for listener in listeners:
				listeners_data[listeners_index[listener]]["listener_name"] = listener

			self.write( json.dumps(listeners_data) )
		elif t == Type.KEYBOARD_DATA:
			speaker_id = self.get_argument("speaker_id", None)
			if not speaker_id:
				return
			print "keyboard data ", speaker_id
			result = self.load_keyboard_consensus(speaker_id)
			self.write( json.dumps(result) )
		elif t == Type.VIDEODATA_NOD:
			speaker_id = self.get_argument("speaker_id", None)
			if not speaker_id:
				return
			print "Retrieve head nod data for ", speaker_id
			listeners_per_speaker = self.load_video_list()
			listeners = listeners_per_speaker[speaker_id]

			blocks = self.load_headnod(speaker_id, listeners)
			keyboard_consensus = self.load_keyboard_consensus(speaker_id)

			gap = 1
			histogram = [0] * len(keyboard_consensus)
			self.convert_to_histogram(blocks, gap, histogram)
			self.write( json.dumps(histogram) )
		elif t == Type.VIDEODATA_SHK:
			speaker_id = self.get_argument("speaker_id", None)
			if not speaker_id:
				return
			print "Retrieve head shake data for ", speaker_id
			listeners_per_speaker = self.load_video_list()
			listeners = listeners_per_speaker[speaker_id]

			blocks = self.load_headshake(speaker_id, listeners)
			keyboard_consensus = self.load_keyboard_consensus(speaker_id)

			gap = 1
			histogram = [0] * len(keyboard_consensus)
			self.convert_to_histogram(blocks, gap, histogram)
			self.write( json.dumps(histogram) )
		elif t == Type.VIDEODATA_SML:
			speaker_id = self.get_argument("speaker_id", None)
			if not speaker_id:
				return
			print "Retrieve smile data for ", speaker_id
			listeners_per_speaker = self.load_video_list()
			listeners = listeners_per_speaker[speaker_id]

			smile_data = self.load_smile(speaker_id, listeners)
			keyboard_consensus = self.load_keyboard_consensus(speaker_id)
		#	speaker_smile_data = self.load_speaker_smile(speaker_id)

			histogram = [0] * len(keyboard_consensus)
		#	speaker_histogram = [0] * len(keyboard_consensus)
			self.convert_smile_to_histogram(smile_data, histogram)

			# convert speaker smile to histogram
		#	for i in xrange(0, len(speaker_histogram)):
		#		frame_index = int(round((i * 100) / 1000 * 25))
		#		if frame_index > len(speaker_smile_data): break
		#		speaker_histogram[i] = speaker_smile_data[frame_index] * 28

		#	self.write( json.dumps([histogram, speaker_histogram]) )
			self.write( json.dumps(histogram) )
		elif t == Type.LISTENER_DATA:
			behavior = self.get_argument("behavior", None)
			speaker_id = self.get_argument("speaker_id", None)
			coders_string = self.get_argument("listeners", None)
			if not behavior or not speaker_id or not coders_string:
				return
			behavior = int(behavior)
			coders = coders_string.split("|")

			keyboard_consensus = self.load_keyboard_consensus(speaker_id)
			histogram = [0] * len(keyboard_consensus)
			if behavior == Type.VIDEODATA_NOD:
				print "Retrieve head nod data for listeners: ", coders_string
				gap = 1
				blocks = self.load_headnod(speaker_id, coders)
				self.convert_to_histogram(blocks, gap, histogram)
			elif behavior == Type.VIDEODATA_SHK:
				print "Retrieve head shake data for listeners: ", coders_string
				gap = 1
				blocks = self.load_headshake(speaker_id, coders)
				self.convert_to_histogram(blocks, gap, histogram)
			elif behavior == Type.VIDEODATA_SML:
				print "Retrieve smile data for listeners: ", coders_string
				smile_data = self.load_smile(speaker_id, coders)
				self.convert_smile_to_histogram(smile_data, histogram)
			self.write( json.dumps(histogram) )








