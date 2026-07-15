# Use stable Node base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend service port
EXPOSE 5000

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Start application server
CMD ["node", "server.js"]
