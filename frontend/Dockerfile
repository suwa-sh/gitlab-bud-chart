FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint script to generate runtime env config
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application with correct host and port
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]