FROM python:3.8-slim-buster

WORKDIR /app

COPY requirements.txt requirements.txt

# For opencv2
RUN apt-get update && apt-get install -y python3-opencv

RUN pip3 install -r requirements.txt

COPY . .

EXPOSE 8000


CMD ["python3", "-m", "flask", "run", "--host=0.0.0.0", "-p 8000"]
