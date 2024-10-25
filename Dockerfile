FROM python:3.8-slim

WORKDIR /app

COPY . .

# PROXY: 10.30.118.20:8080 or 10.255.249.100:3128

RUN pip install --proxy 10.30.118.20:8080 --upgrade pip \
    && pip install --proxy 10.30.118.20:8080 -r requirements.txt


CMD ["bash"]
