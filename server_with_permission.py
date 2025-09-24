# server_with_permissions.py
import http.server, socketserver, argparse, mimetypes

class Handler(http.server.SimpleHTTPRequestHandler):
    # add correct MIME for web app manifest
    mimetypes.init()
    mimetypes.add_type("application/manifest+json", ".webmanifest")

    def end_headers(self):
        # Set your policy here (adjust as needed)
        self.send_header(
            "Permissions-Policy",
            "geolocation=*, accelerometer=*, gyroscope=*, magnetometer=(), microphone=(), camera=()"
        )
        # (Optional) These often help with modern web APIs
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--dir", default=".")
    args = p.parse_args()

    handler = Handler
    # Serve files from --dir
    handler.directory = args.dir

    with socketserver.TCPServer(("", args.port), handler) as httpd:
        print(f"Serving {args.dir} on http://localhost:{args.port}")
        httpd.serve_forever()
