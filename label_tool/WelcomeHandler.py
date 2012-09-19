#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

import random

class WelcomeHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		self.render("welcome.html")

	def post(self):
		turkId = self.get_argument("tid", None)
		if not turkId:
			return None

		# register the user
		try:
			task_id = self.db.execute("INSERT INTO label_video_register (turk_id) VALUES (%s)", turkId)
		except Exception, exception:
			print exception
			print "Fails in registering user"
			return None

		# query the task table to get video list
		entity = None
		try:
			entity = self.db.get("SELECT * FROM label_video_task_list WHERE task_id=%s", str(task_id))
		except Exception, exception:
			print exception
			print "Fails in querying information from task list"
			return None

		if not entity:
			self.write("{\"success\": \"-2\"}")
			return None

		# now I have the task information
		label_type = entity["label_type"]
		tasks = entity["video_list"]
		batch = entity["batch"]

		# check whether the user has already participated in this batch
		user = self.db.get("SELECT * FROM label_video_user WHERE turk_id=%s AND batch=%s", turkId, batch)
		if not user:
			# assign tasks to this new user
			rnd = tasks.split(",")

			random.seed()
			random.shuffle(rnd)
			rnd_task_string = ",".join(rnd)

			try:
				res = self.db.execute(
					"INSERT INTO label_video_user (batch, turk_id, task) VALUES (%s, %s, %s)", batch, turkId, rnd_task_string
				)
				self.write(
					"{\"success\": \"1\", \"type\": \"" + label_type + "\", \"batch\": \"" + str(batch) + "\"}"
				)
			except Exception, exception:
				print exception
				self.write("{\"success\": \"-1\"}")
		else:
			self.write("{\"success\": \"-1\"}")  # the user has already participated in this batch




