import base64
import numpy as np
import cv2
from PIL import Image
import io
import torch


def processByte64(base64_string):
    """
    Returns:
    """

    base64_decoded = base64.b64decode(base64_string)

    image = Image.open(io.BytesIO(base64_decoded))
    image_np = np.array(image)
    image_torch = torch.tensor(np.array(image))
    print("image np is", image_np)
