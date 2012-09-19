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
		label_type = self.get_argument("type", None)
		try:
			self.db.execute(
				"INSERT INTO label_video_task_list (label_type, batch, video_list) VALUES (%s, %s, %s)", label_type, batch, videos
			)
		except Exception, exception:
			print exception

