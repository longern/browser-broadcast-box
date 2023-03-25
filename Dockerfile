FROM denoland/deno:1.32.1

COPY ./deno.json /deno.json
COPY ./server/deps.ts /server/deps.ts
RUN deno cache /server/deps.ts
COPY ./server /server
COPY ./build /build

WORKDIR /
CMD ["deno", "task", "prod"]
