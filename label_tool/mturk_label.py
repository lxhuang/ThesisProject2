#!/usr/bin/env python

import os
import tornado.database
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.options import define, options

from LabelHandler import LabelHandler
from ConfirmHandler import ConfirmHandler
from WelcomeHandler import WelcomeHandler
from InputHandler import InputHandler
from AdminHandler import AdminHandler
from DataviewHandler import DataviewHandler
from DownloadHandler import DownloadHandler
from AnalysisHandler import AnalysisHandler

define("port", default=8483, type=int)

define("mysql_host", default="127.0.0.1:3306")
#define("mysql_host", default="23.23.224.29:3306")
define("mysql_database", default="mturk")
define("mysql_user", default="root")
define("mysql_password", default="")
#define("mysql_password", default="rhubarb")

class Application(tornado.web.Application):
	def __init__(self):
		handlers = [
			(r"/", WelcomeHandler),
			(r"/label", LabelHandler),
			(r"/input", InputHandler),
			(r"/confirm", ConfirmHandler),
			(r"/secret_admin_page", AdminHandler),
			(r"/view_data", DataviewHandler),
			(r"/download", DownloadHandler),
			(r"/analysis", AnalysisHandler),
		]

		settings = dict(
			title = "University of Southern California, Human Behavior Study",
			base_url = "http://localhost:8483/",
			static_path = os.path.join(os.path.dirname(__file__), "static"),
			template_path = os.path.join(os.path.dirname(__file__), "templates"),
		)

		tornado.web.Application.__init__(self, handlers, **settings)

		self.db = tornado.database.Connection(
			host = options.mysql_host,
			database = options.mysql_database,
			user = options.mysql_user,
			password = options.mysql_password
			)

def main():
	tornado.options.parse_command_line()
	http_server = tornado.httpserver.HTTPServer(Application())
	http_server.listen(options.port)
	tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
	main()






