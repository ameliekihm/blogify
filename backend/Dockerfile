# 1. Use Node.js as base image
FROM node:18

# 2. Set working directory
WORKDIR /app

# 3. Copy package files first (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the backend code
COPY . .

# 6. Expose port (Express runs on 4000)
EXPOSE 4000

# 7. Command to start the server
CMD ["node", "server.js"]
