#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

class AdminHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		self.render("admin.html")

	def post(self):
		batch = self.get_argument("batch", None)
		videos = self.get_argument("videos", None)
		task_id = self.get_argument("taskid", None)
		label_type = self.get_argument("type", None)
		try:
			if task_id == "" or not task_id:
				last_one = self.db.query("SELECT max(task_id) as max_id FROM label_video_task_list")
				last_one = last_one[0]["max_id"]
				task_id  = int(last_one) + 1

			self.db.execute(
				"INSERT INTO label_video_task_list (task_id, label_type, batch, video_list) VALUES (%s, %s, %s, %s)", task_id, label_type, batch, videos
			)
		except Exception, exception:
			print exception

