#!/usr/bin/env python

import tornado.httpserver
import tornado.web
import tornado.database

class DataviewHandler(tornado.web.RequestHandler):
	@property
	def db(self):
		return self.application.db

	def get(self):
		pass