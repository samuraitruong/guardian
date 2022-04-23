# Create base image for development
FROM node:16
WORKDIR /app
EXPOSE 3000
EXPOSE 3001
EXPOSE 3002
EXPOSE 3003
EXPOSE 3004
EXPOSE 3005
EXPOSE 4200
RUN npm install -g nodemon
RUN npm install -g ts-node
CMD ["/bin/bash", "build-all.sh"]