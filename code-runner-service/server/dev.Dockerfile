FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl


# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

CMD ["npm", "run", "dev"]
