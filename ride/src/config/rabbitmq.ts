import amqp, { Channel } from "amqplib";

let channel: Channel | null = null;

export const connectRabbitMQ = async (): Promise<Channel> => {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();

  console.log("🐇 Ride Service connected to RabbitMQ");

  return channel;
};

// example usage
// try {
//   await publishEvent("partner.onboarding", {
//     event: "PARTNER_ONBOARDING_UPDATED",
//     payload: {
//       userId: user._id.toString(),
//       step: 1,
//     },
//   });
// } catch (error) {
//   console.log("Queue failed but API success", error);
// }
export const publishEvent = async (queue: string, data: any) => {
  const ch = await connectRabbitMQ();

  await ch.assertQueue(queue, { durable: true });

  ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
};
