"""
Flask server for running deployed gauGAN model
"""

from all_models.gaugan.model_utils import (processByte64, load_model,
                                           run_inference)
from all_models.fast_neural_style.style_utils import stylizeImage
from flask import Flask, request
from flask_cors import CORS
import json
import uuid
import base64

app = Flask(__name__)
CORS(app)

# Load the model
model, opt = load_model()


@app.route('/')
def hello_world():
    return 'Hello, World!'


@app.route('/generate', methods=['POST'])
def generate():
    """Process segmentation map into gauGAN to produce a generated image
    
    Args (in request.json):
        imageData: base64 string representing a png image

    Returns:
        generatedData: base64 string representing a png generated image
    """

    # Generate a request id for saving the images
    request_id = str(uuid.uuid4())

    # Fetch image data
    data = request.get_json()
    image_data = data.get("imageData")

    # Save the image segmentation map
    with open(f"outputs/{request_id}_SEGMENTATION.png", "wb") as fh:
        fh.write(base64.urlsafe_b64decode(image_data))

    # Convert byte64 into labelmap
    image_array = processByte64(image_data)

    # Perform inference
    generated_image = run_inference(image_array, model, opt)

    # Remove the javascript file type header
    generated_image_strip_header = generated_image.lstrip(
        "data:image/png;base64")

    # Save the generated image
    with open(f"outputs/{request_id}_GENERATED.png", "wb") as fh:
        fh.write(base64.urlsafe_b64decode(generated_image_strip_header))

    return {"message": "Successfully got image", "data": generated_image}


@app.route('/stylize', methods=['POST'])
def stylize():
    """Stylize an input image
    
    Args:
        imageData: base64 str
            The input base64 image string.
        style: str ::=    "starry_night"
                        | "rain_princess"
                        | 
            The requested style to stylize the input image with.
    
    Returns:

    """
    # Generate a request id for saving the images
    request_id = str(uuid.uuid4())

    # Fetch image data
    data = request.get_json()
    print("request data is", data)
    image_data = data.get("imageData")

    style = data.get("style")

    # Remove the javascript file type header
    image_data_strip_header = image_data.lstrip("data:image/png;base64")

    styled_image_str = stylizeImage(image_data_strip_header, style)
    return {"message": "Successfully got image", "data": styled_image_str}


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
