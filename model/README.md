# Model
This part of the repository concerns the training and deployment of relevant models (gauGAN, fast-style-transfer). The models are deployed on a Flask server (`app.py`).

# Setup
You will need to download additional files to add into your local to get the model server working. Follow the instructions below:

The GauGAN model uses the open-source pretrained version by Gene Kogan. 
1. Download the "SPADE_pretrained" folder from `https://drive.google.com/drive/folders/1VEiKvM1aR9yug3O6kdvRQXA3s2o3_do3?usp=sharing` and put it under `all_models/gaugan/`.

2. Clone Justin's forked version of `pytorch/examples` repo: 
```shell
cd all_models/fast_neural_style/
git clone git@github.com:leungjch/examples.git
```

# Flask server

## Install dependencies
Run 
```shell
pip install -r requirements.txt
```

## Run server

To start the deployment server, run 
```shell
python app.py
```
# GauGAN (`all_models/gaugan`)
The Flask server relies on `all_models/gaugan/model_utils.py` to perform inference on GauGAN.

# Fast Neural Style (`all_models/fast_neural_style`)
The trained models are included in this repo under `all_models/fast_neural_style/saved_models`. They are small enough (~6mb) to be store-able on Github. 

The Flask server relies on `all_models/fast_neural_style/style_utils.py` to perform inference on the style transfer models. 

The files `InferStyleTransfer.ipynb` and `TrainStyleTransfer.ipyn` are Jupyter notebooks for running an training custom style transfer models.


# Docker
To build the Docker image, run 
```shell
docker build -t leungjch/hai-art-model:latest .
```
To run the Docker image, run
```shell
docker run -p 8000:8000 leungjch/hai-art-model:latest

docker run -d --net elastic -p 8000:8000 -e ELASTICSEARCH_URL="http://es01:9200" leungjch/hai-art-model:latest
```
To push the Docker image to Docker Hub, run
```
docker push leungjch/hai-art-model:latest
```
