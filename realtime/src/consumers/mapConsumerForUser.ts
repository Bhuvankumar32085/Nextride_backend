import { connectRabbitMQ } from "../queues/rabbitmq.js";
import { emitToUser } from "../realtime/emitters/emitToUser.js";

export const videoKysReApply = async () => {
  const channel = await connectRabbitMQ();
  const queue = "";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "event_name") {
        const { userId } = data.payload;


        emitToUser(userId, "event_name", {
          message: "Your video KYC re-application has been received.",
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};
