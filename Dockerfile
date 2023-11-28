# Use an official Node runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle your app's source code inside the Docker image
COPY . .

# Your app binds to port 3000 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 3000

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "run.js" ]