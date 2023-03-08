# Browser Broadcast Box

A low latency video streaming server and client using WebRTC. It can be
deployed on serverless container service like AWS Fargate or Alibaba Cloud
Elastic Container Instance. Just pay for the machine time and traffic you use.

The link in the description does not contain any backend. However, you can
deploy the backend yourself and use the link to connect to it.

## Features

- WHIP/WHEP protocol (compatible with [OBS WHIP output](https://github.com/obsproject/obs-studio/pull/7926))
- Using public IP without STUN server
- Chat using WebRTC DataChannel
- Count of live viewers
- Access HTTP endpoint from HTTPS page

## Usage

### Local development

Install deno first: https://deno.land/manual/getting_started/installation

Serve static files:

```bash
deno run --allow-net --allow-read https://deno.land/std@0.177.0/http/file_server.ts
# or `python3 -m http.server 4507`
```

Run server:

```bash
cd server
deno run -A main.ts
```

Open http://localhost:4507/server/backend.html in browser. This page will
connect to deno process and handle stream forwarding.

Open http://localhost:4507/whip.html in browser. Fill "Link URL" with
http://localhost:11733/whip/endpoint and setup your stream. Then click "Start".

Open http://localhost:4507/whep.html in browser. Fill "Link URL" with
http://localhost:11733/whep/endpoint and click "Watch".

### Deployments

#### Server

Build server docker image:

```bash
cd server
docker build -t browser-broadcast-box .
```

Deploy the image to any serverless container service. Expose port 11733 and
all UDP ports.

#### Client

Deploy static files to any static file hosting service like Cloudflare Pages,
or just use the link in the description. Stream server should be deployed with
a public IP address. It is recommended to use a API gateway or CDN tunnel to
handle HTTPS. Browsers do not allow direct HTTP requests from HTTPS pages, so
a popup may be shown when you click "Start" to proxy the session description.
