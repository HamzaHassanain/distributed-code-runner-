FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code (optional if mounting volume, but good for caching)
COPY . .

CMD ["npm", "run", "dev"]
