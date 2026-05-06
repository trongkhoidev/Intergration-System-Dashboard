from flask import Flask
from flask_cors import CORS
import os

from router import router

app = Flask(__name__)
CORS(app)

app.register_blueprint(router)


@app.route("/")
def index():
    return {
        "msg": "Data Integration API - running OK",
        "docs": "/api/employees"
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))  # 🔥 QUAN TRỌNG
    app.run(host="0.0.0.0", port=port)       # 🔥 QUAN TRỌNG