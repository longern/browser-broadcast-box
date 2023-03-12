FROM zenika/alpine-chrome:108-with-deno

COPY ./server/deps.ts /server/deps.ts
RUN deno cache /server/deps.ts
ENV HEADLESS_CHROMIUM=http://localhost:11733/backend/
COPY ./server /server
COPY ./build /build

WORKDIR /
CMD ["deno", "run", "-A", "server/main.ts"]
