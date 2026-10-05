FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./

ENV SKIP_POSTINSTALL=true
RUN npm ci --legacy-peer-deps

COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_PLANE_URL=http://localhost:3100

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_PLANE_URL=${NEXT_PUBLIC_PLANE_URL}
ENV NEXT_BUILD_CPUS=1

RUN npm run build:icons
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]
