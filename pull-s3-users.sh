#!/bin/bash

# Install awscli if needed
if ! [ -x "$(command -v aws)" ]; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  ./aws/install --install-dir ~/.local/aws-cli --bin-dir ~/.local/bin
fi

aws s3 cp --recursive s3://multimodal-reward-learning/users/ $HOME/research/multimodal-reward-learning/data/miner/users/