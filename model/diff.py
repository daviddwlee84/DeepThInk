# import requests
# import torch
# from PIL import Image
# from io import BytesIO
# from diffusers import StableDiffusionImg2ImgPipeline
# from diffusers.utils import load_image

# model_id_or_path = "runwayml/stable-diffusion-v1-5"
# pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model_id_or_path, torch_dtype=torch.float16)
# pipe = pipe.to("cuda")

# image = load_image(
#     "sketch-mountains-input.jpg"
# )

# init_image = image.resize((768, 512))

# prompt = "A fantasy landscape, trending on artstation"

# images = pipe(prompt=prompt, image=init_image, strength=0.75, guidance_scale=7.5).images
# images[0].save("fantasy_landscape.png")

# return images


# from .diffusers import StableDiffusionControlNetPipeline
import sys
import os



from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
import torch
from controlnet_aux import (CannyDetector, ContentShuffleDetector, HEDdetector,
                            LineartAnimeDetector, LineartDetector,
                            MidasDetector, MLSDdetector, NormalBaeDetector,
                            OpenposeDetector, PidiNetDetector)
from depth_estimator import DepthEstimator
from diffusers.utils import load_image

# Let's load the popular vermeer image
image = load_image(
    "./dt2.png"
)

import cv2
from PIL import Image
import numpy as np

openpose = OpenposeDetector.from_pretrained('lllyasviel/Annotators')
openpose_image = openpose(image)

controlnet = ControlNetModel.from_pretrained("lllyasviel/control_v11f1p_sd15_depth", torch_dtype=torch.float16)
pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5", controlnet=controlnet, torch_dtype=torch.float16
)

# from diffusers import UniPCMultistepScheduler

# pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)

# # this command loads the individual model components on GPU on-demand.
pipe.to("cuda")

generator = torch.manual_seed(0)

out_image = pipe(
    "disco dancer with colorful lights", num_inference_steps=20, generator=generator, image=openpose_image
).images[0]

import os
os.makedirs("oneflow-sd-output", exist_ok=True)

dst = os.path.join("oneflow-sd-output", f"qwe.png")
out_image.save(dst)