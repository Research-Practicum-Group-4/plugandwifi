# --------------------------- Stage 1: Build -----------------------------
# Use Node.js 20 Alpine as a lightweight build environment
FROM node:20-alpine AS build-stage

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to improve Docker layer caching
COPY package*.json ./

# Install dependencies exactly as specified in package-lock.json
RUN npm ci --legacy-peer-deps

# Copy the rest of the frontend source code
COPY . .

# Build-time variables for the Vite frontend
ARG VITE_USE_MOCK=false
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_API_BASE_URL=https://api.plugandwifi.xyz/api

# Make the variables available during npm run build
ENV VITE_USE_MOCK=${VITE_USE_MOCK}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the Vite React application
# The compiled production files will be generated in /app/dist
RUN npm run build


# ------------------------- Stage 2: Production --------------------------
# Use nginx to serve the built static frontend
FROM nginx:stable-alpine AS production-stage

# Copy the built frontend files into nginx's web root
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Configure nginx to support React Router client-side routing
RUN echo '\
server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location = /index.html { \
        add_header Cache-Control "no-store, no-cache, must-revalidate"; \
    } \
    \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Cloud Run is currently configured to send traffic to port 80
EXPOSE 80

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
