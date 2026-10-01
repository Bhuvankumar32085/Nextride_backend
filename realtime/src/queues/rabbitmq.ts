import amqp, { Channel } from "amqplib";

let connection: any = null;
let channel: Channel | null = null;

export const connectRabbitMQ = async (): Promise<Channel> => {
  if (channel && connection) {
    return channel;
  }

  try {
    if (!connection) {
      connection = await amqp.connect(process.env.RABBITMQ_URL!);
      connection.on("error", (err: any) => {
        console.error("RabbitMQ connection error in Realtime service:", err);
        connection = null;
        channel = null;
      });
      connection.on("close", () => {
        console.warn("RabbitMQ connection closed in Realtime service");
        connection = null;
        channel = null;
      });
    }

    if (!channel && connection) {
      channel = await connection.createChannel();
      channel?.on("error", (err: any) => {
        console.error("RabbitMQ channel error in Realtime service:", err);
        channel = null;
      });
      channel?.on("close", () => {
        channel = null;
      });
    }

    if (!channel) {
      throw new Error("Failed to create RabbitMQ channel in Realtime service");
    }

    console.log("🐇 Realtime Service connected to RabbitMQ");
    return channel;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ in Realtime service:", error);
    throw error;
  }
};