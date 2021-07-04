"""
Flask deployment server for running deployed gauGAN model
"""

from model_utils import processByte64
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
    # Fetch image data
    data = request.get_json()

    image_data = data.get("imageData")

    print("IMG DATA IS", repr(image_data))

    image_array = processByte64(image_data)
    return {"message": "Successfully got image"}


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)