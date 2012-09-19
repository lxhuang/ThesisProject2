#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

import random

code = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9']

class ConfirmHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def randomCode(self):
		c = []
		random.seed()
		for i in range(1,37):
			index = random.randint(1, 36)
			c.append( code[index-1] )

		return "".join(c)

	def get(self):
		turk_id = self.get_argument('tid', None)
		batch = self.get_argument('batch', None)
		if (not turk_id) or (not batch):
			return

		code = self.randomCode()

		try:
			self.db.execute(
				"UPDATE label_video_user SET code = %s WHERE turk_id = %s AND batch = %s", code, turk_id, batch
			)
			self.render("confirm.html", code=code)
		except Exception, exception:
			print exception
			return