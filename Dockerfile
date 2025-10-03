# ---- Stage 1: Build TypeScript ----
FROM node:18 AS build

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and assets
COPY tsconfig.json ./
COPY src ./src
COPY index.html ./
COPY style ./style
COPY assets ./assets

# Inject API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build project with injected API URL
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Clean default nginx html folder
RUN rm -rf /usr/share/nginx/html/*

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/assets /usr/share/nginx/html/assets

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
