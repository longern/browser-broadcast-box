FROM zenika/alpine-chrome:108-with-deno

COPY ./deps.ts /
RUN deno cache /deps.ts
ENV HEADLESS_CHROMIUM=/backend.html
COPY ./main.ts ./backend.html ./index.html /

WORKDIR /
CMD ["deno", "run", "-A", "main.ts"]
