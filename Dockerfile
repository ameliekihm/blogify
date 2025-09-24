# ---- Stage 1: Build TypeScript ----
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY index.html ./
COPY style ./style
COPY assets ./assets

RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
