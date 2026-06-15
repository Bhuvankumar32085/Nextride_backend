import { connectRabbitMQ } from "./rabbitmq.js";

export const publishEvent = async (queue: string, data: any) => {
  const ch = await connectRabbitMQ();

  await ch.assertQueue(queue, { durable: true });

  ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
};
