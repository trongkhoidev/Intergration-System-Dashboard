FROM python:3.10-slim

# 1. Cài đặt các thư viện hệ thống cơ bản và ODBC cho SQL Server
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unixodbc \
    unixodbc-dev \
    && curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /usr/share/keyrings/microsoft-prod.gpg \
    && curl -sSL https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# 2. Cài đặt thư mục làm việc
WORKDIR /app

# 3. Copy file requirements và cài đặt Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy toàn bộ source code Backend vào Container
COPY . .

# 5. Khai báo Port
EXPOSE $PORT

# 6. Chạy ứng dụng bằng Gunicorn (Railway sẽ tự động cung cấp biến môi trường $PORT)
CMD gunicorn app:app --bind 0.0.0.0:$PORT
