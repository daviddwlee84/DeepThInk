import base64
from typing import Tuple
import numpy as np
from PIL import Image, ImageOps
import io
import torch
from easydict import EasyDict
import os
import gc
from matplotlib.colors import rgb2hex
from torchvision.transforms import ToPILImage
import replicate
import requests

import sys
import pathlib

dir = pathlib.Path(__file__).parent.resolve()

# Import from SPADE

sys.path.append(
    os.path.join(os.path.dirname(__file__), 'SPADE_pretrained', 'SPADE'))

from models.pix2pix_model import Pix2PixModel
from options.test_options import TestOptions
from options.base_options import BaseOptions
from data.base_dataset import get_params, get_transform

np.set_printoptions(threshold=sys.maxsize)


def parse_opt_file(path):
    file = open(path, 'rb')
    opt = {}
    for line in file.readlines():
        line = str(line).split(': ')
        key = line[0].split(' ')[-1]
        value = line[1].split(' ')[0]
        opt[key] = value
    return opt


def processByte64(base64_string):
    """
    Returns:
    """
    # print("base64 is ", base64_string)

    base64_decoded = base64.b64decode(base64_string)

    image = Image.open(io.BytesIO(base64_decoded))

    # Resize to 512x512
    image = image.resize((512, 512), Image.NEAREST)
    # image.show()

    image_np = np.array(image)
    # print("image np is", image_np, image_np.shape)

    # Get array of hex
    image_hex = []
    for i in range(image_np.shape[0]):
        image_hex_row = []
        for j in range(image_np.shape[1]):
            # Convert to hex (make sure to normalize by dividing by 255)
            hex = rgb2hex(image_np[i, j] / 255.0)
            image_hex_row.append(hex)
        image_hex.append(image_hex_row)
    image_hex = np.array(image_hex)
    image_torch = torch.tensor(np.array(image))

    # Get labels
    image_label = getLabelMap(image_hex)
    # print("image np is", image_hex)

    return image_label


def tensor_to_base64(image_torch: torch.Tensor):
    """
    Converts a torch tensor of normalized rgb values into a base64 jpg string
    """
    # print("image torch is", image_torch, "image torched")

    to_img = ToPILImage()
    normalized_img = ((image_torch.reshape([3, 512, 512]) + 1) / 2.0) * 255.0
    img = to_img(normalized_img.byte().cpu())
    print(type(img))

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    buffered.seek(0)
    img_byte = buffered.getvalue()
    img_str = "data:image/png;base64," + base64.b64encode(img_byte).decode()
    # print(img_str, "final str is")
    print("Successfully sent img str")
    return img_str


# Get PIL image
# image = Image.fromarray(image_torch.cpu().numpy())

# # Get Base64 string
# buffered = io.BytesIO()
# image.save(buffered, format="JPEG")
# img_str = base64.b64encode(buffered.getvalue())
# print("IMG STR IS", img_str, "DONE")
# return img_str
from constants import colorMap

# Enable GPU
device = torch.device("cuda")
# device = torch.device("cpu")


def getLabelMap(image_hex):
    """
    
    """
    image_labels = []
    for i in range(image_hex.shape[0]):
        image_labels_row = []
        for j in range(image_hex.shape[1]):
            # By default, fill with sky if some loss happened.
            label = colorMap.get(image_hex[i, j], colorMap['#000000'])['id']
            image_labels_row.append(label)
        image_labels.append(image_labels_row)
    # print("image labels is", image_labels)
    return np.array(image_labels)


def load_model() -> Tuple[Pix2PixModel, dict]:
    """
    Load the model
    Returns:
        - Pytorch Pix2Pix model with pretrained weights loaded
        - The opt dict
    """
    all_checkpoints_dir = f"{dir}/SPADE_pretrained/SPADE_weights/"
    checkpoint_dir = f"{dir}/SPADE_pretrained/SPADE_weights/landscapes/"
    model_name = 'landscapes'
    with open(os.path.join(checkpoint_dir, 'classes_list.txt'),
              'r') as classes_file:
        classes = eval(classes_file.read())

    opt_file = os.path.join(checkpoint_dir, 'opt.txt')
    parsed_opt = parse_opt_file(opt_file)

    opt = EasyDict({})
    opt.isTrain = False
    opt.checkpoints_dir = all_checkpoints_dir
    opt.name = model_name
    opt.aspect_ratio = float(parsed_opt['aspect_ratio'])
    opt.load_size = int(parsed_opt['load_size'])
    opt.crop_size = int(parsed_opt['crop_size'])
    opt.no_instance = True if parsed_opt['no_instance'] == 'True' else False
    opt.preprocess_mode = parsed_opt['preprocess_mode']
    opt.contain_dontcare_label = True if parsed_opt[
        'contain_dontcare_label'] == 'True' else False
    # Enable GPU
    opt.gpu_ids = parsed_opt['gpu_ids']
    # opt.gpu_ids = []
    opt.netG = parsed_opt['netG']
    opt.ngf = int(parsed_opt['ngf'])
    opt.num_upsampling_layers = parsed_opt['num_upsampling_layers']
    opt.use_vae = True if parsed_opt['use_vae'] == 'True' else False
    opt.label_nc = int(parsed_opt['label_nc'])
    opt.semantic_nc = opt.label_nc + (1 if opt.contain_dontcare_label else
                                      0) + (0 if opt.no_instance else 1)
    opt.norm_G = parsed_opt['norm_G']
    opt.init_type = parsed_opt['init_type']
    opt.init_variance = float(parsed_opt['init_variance'])
    opt.which_epoch = parsed_opt['which_epoch']
    print("Opt is", opt)
    model = Pix2PixModel(opt)
    return model, opt

def apply_stable_diffusion(image, prompt):
    model = replicate.models.get("stability-ai/stable-diffusion-img2img")
    version = model.versions.get("15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d")
    print("prompt", prompt)
    # https://replicate.com/stability-ai/stable-diffusion-img2img/versions/15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d#input
    inputs = {
        # Input prompt
        'prompt': prompt,

        # The prompt NOT to guide the image generation. Ignored when not using
        # guidance
        # 'negative_prompt': ...,

        # Inital image to generate variations of.
        'image': image,

        # Prompt strength when providing the image. 1.0 corresponds to full
        # destruction of information in init image
        'prompt_strength': 0.8,

        # Number of images to output. Higher number of outputs may OOM.
        # Range: 1 to 8
        'num_outputs': 1,

        # Number of denoising steps
        # Range: 1 to 500
        'num_inference_steps': 5,

        # Scale for classifier-free guidance
        # Range: 1 to 20
        'guidance_scale': 7.5,

        # Choose a scheduler.
        'scheduler': "DPMSolverMultistep",

        # Random seed. Leave blank to randomize the seed
        # 'seed': ...,
    }

    # https://replicate.com/stability-ai/stable-diffusion-img2img/versions/15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d#output-schema
    output = version.predict(**inputs)
    return output


from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
from diffusers import StableDiffusionPipeline
# model_id_or_path = "IDEA-CCNL/Taiyi-Stable-Diffusion-1B-Chinese-v0.1"
model_id_or_path = "runwayml/stable-diffusion-v1-5"



def img2img_diffusers(image, prompt):

    from diffusers import StableDiffusionImg2ImgPipeline
    torch.cuda.empty_cache()
    img2img_pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model_id_or_path, torch_dtype=torch.float16).to('cuda:0')
    img2img_pipe.enable_xformers_memory_efficient_attention()

    with torch.inference_mode():
        images = img2img_pipe(prompt=prompt+"精细, 高清", image=image, strength=0.75, num_inference_steps=20, guidance_scale=7.5, negative_prompt=" 广告, ，, ！, 。, ；, 资讯, 新闻, 水印").images
    images[0].save("fantasy_landscape.png")
    
    return images

def text2img_diffusers(prompt):

    text2img_pipe = StableDiffusionPipeline.from_pretrained(model_id_or_path, torch_dtype=torch.float16).to('cuda:0')
    text2img_pipe.enable_xformers_memory_efficient_attention()
    
    with torch.inference_mode():
        images = text2img_pipe(
            prompt=prompt+"精细, 高清", 
            num_inference_steps=20, 
            guidance_scale=7.5, 
            negative_prompt=" 广告, ，, ！, 。, ；, 资讯, 新闻, 水印", 
            num_images_per_prompt=3,
        ).images

    img_list = []

    for i in range(3):
        print(images[i], i)
        output_buffer = io.BytesIO()
        images[i].save(output_buffer, format='PNG')
        byte_data = output_buffer.getvalue()
        generated_base64 = "data:image/png;base64," + base64.b64encode(byte_data).decode()
        img_list.append(generated_base64)

    return img_list

def control_net(image, prompt):

    base64_decoded = base64.b64decode(image)
    img = Image.open(io.BytesIO(base64_decoded))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img = img.resize((512, 512), Image.NEAREST)
    img.save("control_net_in.png")

    # controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-scribble", torch_dtype=torch.float16)
    controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-seg", torch_dtype=torch.float16)

    cn_pipe = StableDiffusionControlNetPipeline.from_pretrained(model_id_or_path, controlnet=controlnet, torch_dtype=torch.float16)

    # this command loads the individual model components on GPU on-demand.
    cn_pipe.enable_model_cpu_offload()
    # cn_pipe.enable_xformers_memory_efficient_attention()

    out_image = cn_pipe(
        prompt=prompt, num_inference_steps=20, image=img, negative_prompt=" 广告, ，, ！, 。, ；, 资讯, 新闻, 水印"
    ).images

    out_image[0].save("control_net.png")

    output_buffer = io.BytesIO()
    out_image[0].save(output_buffer, format='PNG')
    byte_data = output_buffer.getvalue()
    generated_base64 = "data:image/png;base64," + base64.b64encode(byte_data).decode()

    return generated_base64


def run_inference(label_data, model, opt, prompt, flag):
    assert model is not None, 'Error: no model loaded.'
    labelmap = Image.fromarray(np.array(label_data).astype(np.uint8))
    params = None
    transform_label = get_transform(opt,
                                    params,
                                    method=Image.NEAREST,
                                    normalize=False)
    label_tensor = transform_label(labelmap) * 255.0
    label_tensor[label_tensor == 255.0] = opt.label_nc
    print("label_tensor:", label_tensor.shape)

    transform_image = get_transform(opt, params)
    image_tensor = transform_image(Image.new('RGB', (500, 500)))
    data = {
        'label': label_tensor.unsqueeze(0),
        'instance': label_tensor.unsqueeze(0),
        'image': image_tensor.unsqueeze(0)
    }
    generated = model(data, mode='inference')
    print("generated_image:", generated.shape)
    # apply stable diffusion to improve the generated result

    # Get the base64 string to send back to frontend
    generated_base64 = tensor_to_base64(generated)

    if (flag == 2):
        res = img2img_diffusers(generated, prompt)
        print("img2img_diffusers done", res)
        
        # response = requests.get(res[0])
        # img = Image.open(res[0])
        # size = 512, 512
        # img_resized = img.resize(size, Image.ANTIALIAS)
        # print("+++++++", img_resized)

        output_buffer = io.BytesIO()
        res[0].save(output_buffer, format='PNG')
        byte_data = output_buffer.getvalue()
        generated_base64 = "data:image/png;base64," + base64.b64encode(byte_data).decode()

    return generated_base64
