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

Build static files:

```bash
npm install
npm run build
```

Install deno: https://deno.land/manual/getting_started/installation

Run server:

```bash
deno task dev
```

Open http://localhost:11733/backend/ in browser. This page will
connect to deno process and handle stream forwarding.

Open http://localhost:11733/ to browse the client.

### Deployments

#### Server

Build server docker image:

```bash
docker compose build
```

Deploy the image to any serverless container service. Expose port 11733 and
all UDP ports.
