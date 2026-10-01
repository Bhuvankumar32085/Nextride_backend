import amqp, { Channel } from "amqplib";

let connection: any = null;
let channel: Channel | null = null;

export const connectRabbitMQ = async (): Promise<Channel> => {
  if (channel && connection) {
    return channel;
  }

  try {
    if (!connection) {
      const rabbitUrl = (process.env.RABBITMQ_URL || "").trim();
      if (!rabbitUrl) {
        throw new Error("RABBITMQ_URL is not defined in Auth service");
      }
      connection = await amqp.connect(rabbitUrl);
      connection.on("error", (err: any) => {
        console.error("RabbitMQ connection error in Auth service:", err);
        connection = null;
        channel = null;
      });
      connection.on("close", () => {
        console.warn("RabbitMQ connection closed in Auth service");
        connection = null;
        channel = null;
      });
    }

    if (!channel && connection) {
      channel = await connection.createChannel();
      channel?.on("error", (err: any) => {
        console.error("RabbitMQ channel error in Auth service:", err);
        channel = null;
      });
      channel?.on("close", () => {
        channel = null;
      });
    }

    if (!channel) {
      throw new Error("Failed to create RabbitMQ channel in Auth service");
    }

    return channel;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ in Auth service:", error);
    throw error;
  }
};

export const publishEvent = async (queue: string, data: any) => {
  const ch = await connectRabbitMQ();
  await ch.assertQueue(queue, { durable: true });
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
};
