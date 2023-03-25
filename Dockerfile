FROM zenika/alpine-chrome:108-with-deno

COPY ./server/deps.ts /server/deps.ts
RUN deno cache /server/deps.ts
COPY ./server /server
COPY ./build /build

WORKDIR /
CMD ["deno", "run", "-A", "server/main.ts"]
