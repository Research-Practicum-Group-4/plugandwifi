# --------------------------- Stage 1: Build -----------------------------
# Use node:20-alpine as a lightweight build environment
FROM node:20-alpine AS build-stage

# Set the working directory in the container
WORKDIR /app

# Copy only the package files so npm can install dependencies
COPY package*.json ./

# Install dependencies exactly as specified in package-lock.json
RUN npm ci --legacy-peer-deps

# Copy the rest of the source code (node_modules will be ignored by .dockerignore)
COPY . .

# real backend URL for production
ENV VITE_API_BASE_URL=https://api.plugandwifi.xyz/api

# Build the Vite (React) application - output will be in /app/dist
RUN npm run build

# --------------------------- Stage 2: Production ------------------------
# Use the minimal nginx image to serve static files
FROM nginx:stable-alpine AS production-stage

# Copy the built files from the build-stage into nginx's web root
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Configure nginx to support client-side routing (React Router)
RUN echo '\
server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80 - Cloud Run will map this to the service
EXPOSE 80

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]