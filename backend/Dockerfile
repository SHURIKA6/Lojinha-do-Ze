FROM node:20-alpine

# Install dependencies needed for some node packages
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose wrangler dev port
EXPOSE 8787

# Run wrangler dev binding to all interfaces
CMD ["npm", "run", "dev", "--", "--ip", "0.0.0.0"]
