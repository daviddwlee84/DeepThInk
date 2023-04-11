"""
Flask server for running deployed gauGAN model
"""
import numpy as np
from numpy import imag
from all_models.gaugan.model_utils import (processByte64, load_model,
                                           run_inference, control_net, text2img_diffusers)
from all_models.fast_neural_style.style_utils import stylizeImage
from brushes import getBrush
from flask import Flask, request, current_app
from flask_cors import CORS
import json
import gc
import uuid
import base64
from PIL import Image, ImageDraw, ImageColor
import torch
import io
import os
from dotenv import load_dotenv
from datetime import datetime
import requests

load_dotenv()  

app = Flask(__name__, static_folder="DeepThInkWeb")
CORS(app)

# Load the model
model, opt = load_model()
model.eval()

from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
from diffusers import StableDiffusionImg2ImgPipeline
from diffusers import StableDiffusionPipeline


@app.route('/')
def hello_world():
    return current_app.send_static_file('index.html')
    # return 'Hello, World!'


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
    prompt = data.get("prompt")
    flag = data.get("flag")
    # print("---------------", image_data)

    # Save the image segmentation map
    with open(f"outputs/{request_id}_SEGMENTATION.png", "wb") as fh:
        fh.write(base64.urlsafe_b64decode(image_data))

    # Convert byte64 into labelmap
    image_array = processByte64(image_data)
    # print(image_array)

    # Perform inference gaugan and stable diffusion
    if(flag != 3):
        generated_image = run_inference(image_array, model, opt, prompt, flag)
    else:
        generated_image = control_net(image_data, prompt)


    #
    #
    # response = requests.get(generated_image[0])
    # img = Image.open(io.BytesIO(response.content))
    # size = 256, 256
    # img_resized = img.resize(size, Image.ANTIALIAS)
    # print("+++++++", img_resized)

    # output_buffer = io.BytesIO()
    # img_resized.save(output_buffer, format='PNG')
    # byte_data = output_buffer.getvalue()
    # base64_str = base64.b64encode(byte_data).decode()
    # #
    #
    # print("+++++++", base64_str)

    # Remove the javascript file type header
    # generated_image_strip_header = generated_image.lstrip(
    #     "data:image/png;base64")

    # Save the generated image
    # with open(f"outputs/{request_id}_GENERATED.png", "wb") as fh:
    #     fh.write(base64.urlsafe_b64decode(generated_image_strip_header))

    return {"message": "Successfully got image", "data": generated_image}

@app.route('/inspire', methods=['POST'])
def inspire():
    # Generate a request id for saving the images
    request_id = str(uuid.uuid4())

    # Fetch image data
    data = request.get_json()
    prompt = data.get("prompt")
    print("---------------", prompt)
    images = text2img_diffusers(prompt)

    return {"message": "Successfully got prompt", "data": images}

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

@app.route("/makeBrush", methods=['POST'])
def makeBrush():
    # Fetch image data
    data = request.get_json()
    print("request data is", data)

    brushColorRGB = data['color']
    brushType = data['brushType']

    b_base64 = getBrush(brushType, brushColorRGB)
    print("img is", b_base64)
    
    return {"message": "Success", "data": {"imageData": "data:image/png;base64," + b_base64}}


# Color fill an image
@app.route('/colorize', methods=['POST'])
def colorize():
    # Fetch image data
    data = request.get_json()
    print("request data is", data)
    image_data = data.get("imageData")
    # Remove the javascript file type header
    base64_decoded = base64.b64decode(image_data)

    img = Image.open(io.BytesIO(base64_decoded))

    width = img.size[0] 
    height = img.size[1] 
    for i in range(0,width):# process all pixels
        for j in range(0,height):
            data = img.getpixel((i,j))
            #print(data) #(255, 255, 255)
            if (data[0]==255 and data[1]==255 and data[2]==255):
                img.putpixel((i,j),(44, 44, 44))
    img.show()
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue())


    return {"message":"Success", "data": img_str}

# Save generated paintings
# @app.route('/save', methods=['POST'])
# def save():
#     # Get the displayed image data
#     data = request.get_json()
#     aiCanvasData = data.get("aiCanvasImageData", "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
#     backgroundCanvasData = data.get("displayedImageData", "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
#     foregroundCanvasData = data.get("userCanvasImageData", "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
#     userId = data.get("userId", "unknownUser")
#     if (backgroundCanvasData == ""):
#         now = datetime.now()
#         dt_string = now.strftime("%d-%m-%Y-%H:%M:%S")

#         filename1 = "img/" + userId + "-"+dt_string+".png"


#         foreground_base64_decoded = base64.b64decode(foregroundCanvasData)

#         # Get the background
#         foreground_img = Image.open(io.BytesIO(foreground_base64_decoded)).resize((512,512))


#         objPainting = s3.Object(os.environ['S3_BUCKET'],filename1)

#         buffered = io.BytesIO()
#         foreground_img.save(buffered, format="PNG")
#         final_painting_str = base64.b64encode(buffered.getvalue()).decode('utf-8')



#         objPainting.put(Body=base64.b64decode(final_painting_str))

#         return {"message":"Success", "data": "data:image/png;base64," +  foregroundCanvasData}
    

#     # Remove the javascript file type header
#     aiCanvasData = base64.b64decode(aiCanvasData)
#     foreground_base64_decoded = base64.b64decode(foregroundCanvasData)
#     background_base64_decoded = base64.b64decode(backgroundCanvasData)

#     # Get the background
#     background_img = Image.open(io.BytesIO(background_base64_decoded)).resize((512,512))
#     foreground_img = Image.open(io.BytesIO(foreground_base64_decoded)).resize((512,512))
#     canvas_img =  Image.open(io.BytesIO(aiCanvasData)).resize((512,512))

#     # Overlay the foreground onto the background
#     background_img.paste(foreground_img, (0, 0), foreground_img)

#     # save painting
#     buffered = io.BytesIO()
#     background_img.save(buffered, format="PNG")
#     final_painting_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
#     now = datetime.now()


#     dt_string = now.strftime("%d-%m-%Y-%H:%M:%S")
#     filename = "img/" + userId + "-"+dt_string+".png"
#     obj = s3.Object(os.environ['S3_BUCKET'],filename)
#     obj.put(Body=base64.b64decode(final_painting_str))

#     print(final_painting_str)

#     return {"message":"Success", "data": "data:image/png;base64," + final_painting_str}



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
