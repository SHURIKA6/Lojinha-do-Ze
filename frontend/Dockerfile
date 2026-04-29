FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Next.js port
EXPOSE 3000

# Next.js dev server
CMD ["npm", "run", "dev"]
