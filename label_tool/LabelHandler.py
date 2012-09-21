#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

class LabelHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		turkId = self.get_argument("tid", None)
		batch = self.get_argument("batch", None)
		label_type = self.get_argument("type", None)
		if not label_type or not turkId or not batch:
			return None

		self.render("label.html", turkId=turkId, batch=batch, label_type=label_type)

	# Retrieve the next video
	def post(self):
		turk_id = self.get_argument("tid", None)
		batch = self.get_argument("batch", None)
		if not turk_id or not batch:
			return None

		try:
			user = self.db.get("SELECT * FROM label_video_user WHERE turk_id = %s AND batch = %s", turk_id, batch)
			task_string = user["task"]
			tasks = task_string.split(",")
			self.write("{\"v\": \"" + tasks[0] + "\"}")
		except Exception, exception:
			print "Fail in retrieving tasks from label_video_user"
			print exception


