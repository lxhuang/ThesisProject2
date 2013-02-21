#!/usr/bin/env python

# to measure the coder agreement
from __future__ import division
import os

class DataSource:
	# key is video id, and the value is a list [label1, label2]
	# each label is a list of [beg,end]
	data_source = dict()

	# load data
	def load(self, root_path):
		cls = DataSource
		for filename in os.listdir( root_path ):
			(name, extension) = os.path.splitext( filename )
			if extension == ".txt":
				fhandler = open(root_path + "/" + filename, "r")
				lines = fhandler.readlines()
				fhandler.close()

				# parse the label data
				cls.data_source[name] = []
				for line in lines:
					blocks = []
					labels = line.split("|")
					for label in labels:
						index = 0
						beg,end = label.split(",")
						beg = float(beg)
						end = float(end)
						if beg > end or (end - beg < 0.1):  # ignore the zero width head nod
							continue
						
						while index < len(blocks):
							if end < blocks[index][0]:
								blocks.insert(index, [beg, end])
								#print "case 1", name, beg, end
								break
							elif beg < blocks[index][0] and end >= blocks[index][0] and end <= blocks[index][1]:
								blocks[index][0] = beg
								#print "case 2", name, beg, end
								break
							elif beg < blocks[index][0] and end > blocks[index][1]:
								#blocks[index][0] = beg
								#blocks[index][1] = end
								#print "case 5", name, beg, end
								del blocks[index]
								continue
							elif beg >= blocks[index][0] and end <= blocks[index][1]:
								#print "case 3", name, beg, end
								break
							elif beg >= blocks[index][0] and beg <= blocks[index][1] and end > blocks[index][1]:
								#blocks[index][1] = end
								beg = blocks[index][0]
								del blocks[index]
								#print "case 4", name, beg, end
								continue
							index = index + 1
						
						if index == len(blocks):
							blocks.append([beg, end])
					cls.data_source[name].append(blocks)


class Agreement:
	# label1 and label2 are lists, containing [beg,end]
	def check(self, label1, label2):
		blocks = []
		for ll in label1:
			blocks.append([ll[0], ll[1], 1])  # [beg, end, height]

		for ll in label2:
			inserted = False
			index = 0
			while index < len(blocks):
				if ll[0] > blocks[index][1]:
					index = index + 1
				elif ll[1] < blocks[index][0]:
					blocks.insert(index, [ll[0], ll[1], 1])
					inserted = True
					break
				elif ll[0] >= blocks[index][0]:
					if ll[1] <= blocks[index][1]:
						blocks[index][2] = blocks[index][2] + 1
						inserted = True
						break
					elif ll[1] > blocks[index][1]:
						blocks[index][1] = ll[1]
						blocks[index][2] = blocks[index][2] + 1
						i = index + 1
						while i < len(blocks) and blocks[i][0] <= blocks[index][1]:
							blocks[index][1] = max(blocks[index][1], blocks[i][1])
							del blocks[i]
						inserted = True
						break
				elif ll[0] < blocks[index][0]:
					if ll[1] <= blocks[index][1]:
						blocks[index][0] = ll[0]
						blocks[index][2] = blocks[index][2] + 1
						inserted = True
						break
					elif ll[1] > blocks[index][1]:
						blocks[index][0] = ll[0]
						blocks[index][1] = ll[1]
						blocks[index][2] = blocks[index][2] + 1
						i = index + 1
						while i < len(blocks) and blocks[i][0] < blocks[index][1]:
							blocks[index][1] = max(blocks[index][1], blocks[i][1])
							del blocks[i]
						inserted = True
						break
			if not inserted:
				blocks.append([ll[0], ll[1], 1])

		count = 0
		for block in blocks:
			if block[2] > 1:
				count = count + 1
		return count / len(blocks)

	def load(self, root_path):
		datasource = DataSource()
		datasource.load(root_path)
		count = 0
		sum_alpha = 0
		for video in datasource.data_source.iterkeys():
			labels = datasource.data_source[video]
			if len(labels) < 2:
				if len(labels) == 0:
					print "----- No data for ", video
				continue
			else:
				alpha = self.check(labels[0], labels[1])
				sum_alpha = sum_alpha + alpha
				count = count + 1
				print video, "\t", alpha
		print "average alpha: ", sum_alpha / count

		return
		print "this should never be printed"

		#-----------------
		#output
		#-----------------
		output_path = "/Users/Lixing/Documents/projects/ThesisProject/label_tool/data/agreement"
		for video in datasource.data_source.iterkeys():
			labels = datasource.data_source[video]
			if len(labels) < 2:
				continue
			else:
				# find the end time
				end_time = []
				try:
					for l in labels: end_time.append(l[-1][1])
				except Exception, exception:
					print exception, "->", video
					continue

				# save it to file
				filename = output_path + "/" + video + ".txt"
				fhandler = open(filename, "w")
				for label in labels:
					timeline = [0] * int(max(end_time) * 10)  # the framerate is 100ms
					for ll in label:
						beg = int(ll[0] * 10) - 1
						end = int(ll[1] * 10) - 1
						for i in range(beg,end+1):
							timeline[i] = 1

					# print the timeline
					timeline_string = ""
					for i in range(0,len(timeline)):
						timeline_string = timeline_string + str(timeline[i])
						if i < len(timeline) - 1:
							timeline_string = timeline_string + ","

					fhandler.write(timeline_string + "\n")
				fhandler.close()


if __name__ == "__main__":
	agreement = Agreement()
	agreement.load("/Users/Lixing/Documents/projects/ThesisProject/label_tool/data/headshake")





