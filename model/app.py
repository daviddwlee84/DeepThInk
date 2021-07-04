"""
Flask deployment server for running deployed gauGAN model
"""

from flask import Flask, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)


@app.route('/')
def hello_world():
    return 'Hello, World!'


@app.route('/generate', methods=['POST'])
def generate():
    imageData = request.get_json()

    print("image data is", imageData)

    return {"message": "Successfully got image"}


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)