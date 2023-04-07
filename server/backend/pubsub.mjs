const subscribers = {};

/**
 * @param {string} topic
 * @param {RTCDataChannel} channel
 */
export function subscribe(topic, channel) {
  if (!subscribers[topic]) {
    subscribers[topic] = new Set();
  }
  subscribers[topic].add(channel);
  channel.addEventListener("close", () => {
    subscribers[topic].delete(channel);
  });
}

/**
 * @param {string} topic
 * @param {string} message
 * @param {RTCDataChannel?} dataChannel
 */
export function publish(topic, message, dataChannel) {
  if (!subscribers[topic]) return;
  subscribers[topic].forEach((channel) => {
    if (channel === dataChannel) return;
    channel.send(message);
  });
}
