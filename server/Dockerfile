FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm install

# Copy application files
COPY server .

# Create necessary directories
RUN mkdir -p data/templates data/configs builds

# Expose API port
EXPOSE 3002

# Start the application
CMD ["node", "index.js"] 