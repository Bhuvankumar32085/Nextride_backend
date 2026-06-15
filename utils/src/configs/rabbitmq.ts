import amqp, { Channel } from "amqplib";

let channel: Channel;

export const connectRabbitMQ = async (): Promise<Channel> => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();

  console.log("🐇 Auth Service connected to RabbitMQ");

  return channel;
};