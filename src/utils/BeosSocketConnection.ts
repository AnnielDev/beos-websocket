import { BeosWebSocket } from "./BeosWebSocket";

interface Props {
  protocols?: string | string[];
}

const BeosSocketConnection = ({ protocols }: Props = {}): BeosWebSocket => {
  const ws = new BeosWebSocket(protocols);

  ws.on("open", () => {
    console.log("✅ Conexión establecida");
  });

  ws.on("close", () => {
    console.log("❌ Conexión WebSocket cerrada");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
  ws.connect();

  return ws;
};

export { BeosWebSocket, BeosSocketConnection };
