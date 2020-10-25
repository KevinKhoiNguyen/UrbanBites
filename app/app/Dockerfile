############################################################
# Dockerfile to build UrbanBites
# Based on Node
############################################################

# Set the base image
FROM node:10

# Copy App source
COPY . /app


# Set the work directory to /app
WORKDIR /app

# Install app dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start Command as per package.json
CMD ["npm","start"]
