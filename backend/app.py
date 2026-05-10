from flask import Flask
from flask_cors import CORS
import os

from routes import auth_router, employees_router, payroll_router, dashboard_router, admin_router

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_router)
app.register_blueprint(employees_router)
app.register_blueprint(payroll_router)
app.register_blueprint(dashboard_router)
app.register_blueprint(admin_router)


@app.route("/")
def index():
    return {
        "msg": "Data Integration API - running OK",
        "docs": "/api/employees"
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    # Bật debug=True để tự động reload khi sửa code
    app.run(host="0.0.0.0", port=port, debug=True)