#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

class InputHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def post(self):
		label_type = self.get_argument("type", None)  # the type of label
		video_id = self.get_argument("vid", None)  # video Id
		turk_id = self.get_argument("tid", None)  # amazon turk Id
		labels = self.get_argument("dat", None)  # the labels
		batch = self.get_argument("batch", None)  # which batch is the user in
		if not label_type or not video_id or not turk_id or not labels or not batch:
			return None

		# insert labels into the database
		try:
			print labels
			self.db.execute("INSERT INTO label_video_data (turk_id, video_id, type, labels, created_at, batch)"
				"VALUES (%s, %s, %s, %s, UTC_TIMESTAMP(), %s)", turk_id, video_id, label_type, labels, batch
			)
		except Exception, exception:
			print "Fails in inserting labels into label_video_data"
			print exception

		# remove the video from the user's task list
		try:
			user = self.db.get("SELECT * FROM label_video_user WHERE turk_id = %s AND batch = %s", turk_id, batch)
			task_string = user["task"]

			tasks = task_string.split(",")
			if len(tasks) == 0:
				self.write("{\"v\": \"null\"}")
				return

			tasks.pop(0)
			task_string = ",".join(tasks)

			# update the tasks in the user's task list
			try:
				self.db.execute("UPDATE label_video_user SET task = %s WHERE turk_id = %s AND batch = %s", task_string, turk_id, batch)
			except Exception, exception:
				print "Fails in updating tasks in label_video_user"
				print exception

		except Exception, exception:
			print "Fails in retrieving data from label_video_user"
			print exception




