import { connectRabbitMQ } from "../config/rabbitmq.js";
import PartnerBank from "../model/partnerbanc.model.js";
import PartnerDocs from "../model/partnerDocs.model.js";
import Vehicle from "../model/vehicle.model.js";

export const startPartnerApprovedConsumer = async () => {
  const channel = await connectRabbitMQ();

  const queue = "partner.approved";

  await channel.assertQueue(queue, {
    durable: true,
  });

  console.log("📥 Listening partner approved...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "PARTNER_APPROVED") {
        const { userId } = data.payload;

        // 🔥 parallel updates
        await Promise.all([
          PartnerBank.findOneAndUpdate(
            { owner: userId },
            {
              status: "verified",
            },
          ),

          PartnerDocs.findOneAndUpdate(
            { owner: userId },
            {
              status: "approved",
            },
          ),

          Vehicle.findOneAndUpdate(
            { owner: userId },
            {
              status: "approved",
            },
          ),
        ]);

        console.log("✅ Partner fully approved:", userId);
      }

      channel.ack(msg);
    } catch (error) {
      console.error("❌ Consumer Error:", error);

      channel.nack(msg, false, false);
    }
  });
};
