#!/usr/bin/env python
import os
import tornado.httpserver
import tornado.web
import tornado.database

class DownloadHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		self.render("download.html")

	def post(self):
		try:
			index = 1

			# configuration
			batch_lo_limit   = 65
			batch_hi_limit   = 96
			null_verify_code = "na"
			root = os.path.join(os.path.dirname(__file__), "data/headshake1")

			valid_coders = self.db.query("SELECT * FROM label_video_user WHERE code != %s and batch >= %s and batch <= %s order by batch",
				null_verify_code, batch_lo_limit, batch_hi_limit)
			for valid_coder in valid_coders:
				count  = 0
				labels = self.db.query("SELECT * FROM label_video_data WHERE turk_id = %s and batch = %s", valid_coder["turk_id"], valid_coder["batch"])
				for label in labels:
					count = count + 1
					video_id = label["video_id"]
					label_data = label["labels"]
					#if not label_data:
					#	continue

					filename = root + "/" + video_id + ".txt"
					fhandler = open(filename, "a")
					if not label_data:
						fhandler.close()
					else:
						fhandler.write(label_data + "\n")
						fhandler.close()

				print index, valid_coder["turk_id"], valid_coder["batch"], count
				index = index + 1

		except Exception, exception:
			print exception