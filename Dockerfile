FROM alpine:3.20

ARG POCKETBASE_VERSION=0.23.1

RUN apk add --no-cache ca-certificates unzip wget \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" -O /tmp/pocketbase.zip \
    && unzip -q /tmp/pocketbase.zip -d /app \
    && rm /tmp/pocketbase.zip \
    && chmod +x /app/pocketbase

WORKDIR /app
COPY pocketbase/pb_migrations ./pb_migrations
COPY railway-start.sh ./railway-start.sh
RUN chmod +x ./railway-start.sh

ENV PB_DATA_DIR=/app/pb_data
ENV PB_MIGRATIONS_DIR=/app/pb_migrations

EXPOSE 8090
CMD ["./railway-start.sh"]
