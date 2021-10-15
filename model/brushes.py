import json
import uuid
import base64
from PIL import Image, ImageDraw, ImageColor
import numpy as np
import io

path_to_brushes = "./resources"

# Load brush
def loadBrushImage(path):
    with open(path, "rb") as img_file:
        my_string = base64.b64encode(img_file.read())
        brush_base64 = my_string.decode('utf-8')
        return brush_base64


brushPaths = {
    "image_brush": f"{path_to_brushes}/brush.png",
    "image_charcoal": f"{path_to_brushes}/charcoal_texture.png",
    "image_chalk": f"{path_to_brushes}/chalk.png",
    "image_ballpoint": f"{path_to_brushes}/ballpoint.png",
}


def getBrush(brushType, brushColorRGB):

    # Fetch the color and convert to hex
    brushColorHex = ImageColor.getcolor(brushColorRGB, "RGB")

    # Load the brush image
    brushPath = brushPaths.get(brushType)
    if brushPath is None:
        return ""
    image = Image.open(brushPath).convert("RGBA")

    data = np.array(image)

    # Colorize the brush
    data[:,:,0],data[:,:,1],data[:,:,2] = brushColorHex

    img2 = Image.fromarray(data, mode='RGBA')

    # Encode image as base64 string
    buffered = io.BytesIO()
    img2.save(buffered, format="PNG")
    b_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    return b_base64
