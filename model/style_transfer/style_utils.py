from style_transfer.pytorch_examples.examples.fast_neural_style.neural_style.vgg import Vgg16
from style_transfer.pytorch_examples.examples.fast_neural_style.neural_style.transformer_net import TransformerNet
import torch
import re
import cv2
from style_transfer.pytorch_examples.examples.fast_neural_style.neural_style import utils
import torch
from torch.optim import Adam
from torch.utils.data import DataLoader
from torchvision import datasets
from torchvision import transforms

import cv2
import matplotlib.pyplot as plt

from PIL import Image
import base64
import io

device = torch.device("cuda")
# Loads pre-trained weights
rain_princess_path = './style_transfer/saved_models/rain_princess.pth'
candy_path = './style_transfer/saved_models/candy.pth'
mosaic_path = './style_transfer/saved_models/mosaic.pth'
udnie_path = './style_transfer/saved_models/udnie.pth'


# Loads the pre-trained weights into the fast neural style transfer
# network architecture and puts the network on the Cloud TPU core.
def load_style(path):
    with torch.no_grad():
        model = TransformerNet()
        state_dict = torch.load(path)
        # filters deprecated running_* keys from the checkpoint
        for k in list(state_dict.keys()):
            if re.search(r'in\d+\.running_(mean|var)$', k):
                del state_dict[k]
        model.load_state_dict(state_dict)
        return model.to(device)


# Creates each fast neural style transfer network
rain_princess = load_style(rain_princess_path)
candy = load_style(candy_path)
mosaic = load_style(mosaic_path)
udnie = load_style(udnie_path)


def stylizeImage(imageData: str, style: str):

    base64_decoded = base64.b64decode(imageData)

    # Load the content image
    content_image = utils.load_image(io.BytesIO(base64_decoded), scale=None)
    content_transform = transforms.Compose(
        [transforms.ToTensor(),
         transforms.Lambda(lambda x: x.mul(255))])
    content_image = content_transform(content_image)
    content_image = content_image.unsqueeze(0).to(device)

    # Generate the stylized image
    with torch.no_grad():
        #   output = rain_princess(content_image)
        #   output = candy(content_image)
        #   output = mosaic(content_image)

        # Perform model inference
        output = mosaic(content_image)

        # Get base64 string representation
        output_str = utils.save_image_base64(output[0].cpu())

    return {
        "message": f"Successfully stylized image with style: {style}",
        "data": output_str
    }
