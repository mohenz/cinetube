from scripts.local_api import Handler


class handler(Handler):
    def normalize_api_path(self):
        if self.path == "/api":
            self.path = "/"
        elif self.path.startswith("/api/"):
            self.path = self.path[4:]

    def do_OPTIONS(self):
        self.normalize_api_path()
        super().do_OPTIONS()

    def do_GET(self):
        self.normalize_api_path()
        super().do_GET()

    def do_POST(self):
        self.normalize_api_path()
        super().do_POST()

    def do_PATCH(self):
        self.normalize_api_path()
        super().do_PATCH()

    def do_DELETE(self):
        self.normalize_api_path()
        super().do_DELETE()
