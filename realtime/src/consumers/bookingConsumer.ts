import { connectRabbitMQ } from "../queues/rabbitmq.js";
import { emitToUser } from "../realtime/emitters/emitToUser.js";

export const notifyPartnerForBooking = async () => {
  const channel = await connectRabbitMQ();
  const queue = "notify-partner";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());


      if (data.event === "NOTIFY_PARTNER_FOR_BOOKING") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_PARTNER_FOR_BOOKING", { booking });
      }

      if (data.event === "NOTIFY_PARTNER_RIDE_CANCELLED_BY_USER") {
        const { userId, booking, reason } = data.payload;

        emitToUser(userId, "NOTIFY_PARTNER_RIDE_CANCELLED_BY_USER", {
          booking,
          reason,
        });
      }
      

      if (data.event === "NOTIFY_PARTNER_IF_USER_CANCLE_BOOKING") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_PARTNER_IF_USER_CANCLE_BOOKING", {
          booking,
        });
      }

      if (data.event === "NOTIFY_PARTNER_IF_USER_SUCCESSFULLY_GET_PAYMNET") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_PARTNER_IF_USER_SUCCESSFULLY_GET_PAYMNET", {
          booking,
        });
      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const notifyUserForBookingByPartner = async () => {
  const channel = await connectRabbitMQ();
  const queue = "notify-user-by-partner";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "NOTIFY_USER_FOR_ACCEPT_BOOKING_BY_PARTNER") {
        const { userId, booking } = data.payload;

        console.log(
          `📢 Emitting NOTIFY_USER_FOR_ACCEPT_BOOKING_BY_PARTNER to user ${userId}`,
        );

        emitToUser(userId, "NOTIFY_USER_FOR_ACCEPT_BOOKING_BY_PARTNER", {
          booking,
        });
      }

      if (data.event === "NOTIFY_USER_RIDE_COMPLETED") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_USER_RIDE_COMPLETED", {
          booking,
        });
      }

      if (data.event === "NOTIFY_USER_FOR_OTP") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_USER_FOR_OTP", {
          booking,
        });
      }

      if (data.event === "NOTIFY_USER_RIDE_STARTED") {
        const { userId, booking } = data.payload;

        emitToUser(userId, "NOTIFY_USER_RIDE_STARTED", {
          booking,
        });
      }

      if (data.event === "NOTIFY_USER_RIDE_CANCELLED") {
        const { userId, booking, reason } = data.payload;

        emitToUser(userId, "NOTIFY_USER_RIDE_CANCELLED", {
          booking,
          reason,
        });
      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};
