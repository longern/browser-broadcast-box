import React, { useContext } from "react";
import "./Messages.css";

import { MessagesContext } from "../contexts/MessagesContext";

export default function Messages() {
  const messages = useContext(MessagesContext);
  return (
    <div className="messages">
      {messages.map((message) => (
        <div className="message" key={message.id}>
          {message.content}
        </div>
      ))}
    </div>
  );
}
