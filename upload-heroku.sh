#!/bin/bash

# Check if heroku is logged in
if ! $(heroku auth:whoami); then
  heroku login
fi
git push heroku main