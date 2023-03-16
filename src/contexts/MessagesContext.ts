import React from "react";

export type Message = {
  id: string;
  content: string;
};

export const MessagesContext = React.createContext<Message[]>([]);
export const SetMessagesContext = React.createContext<
  (messages: Message[]) => void
>(() => {});
