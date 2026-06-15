import { connectRabbitMQ } from "../config/rabbitmq.js";
import User from "../model/user.model.js";

export const startOnboardingConsumer = async () => {
  const channel = await connectRabbitMQ();
  const queue = "partner.onboarding";
  await channel.assertQueue(queue, { durable: true });


  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "PARTNER_ONBOARDING_UPDATED") {
        const { userId, step } = data.payload;

        await User.findByIdAndUpdate(userId, {
          partnerOnboardingSteps: step,
        });

      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const startAddNumber = async () => {
  const channel = await connectRabbitMQ();
  const queue = "partner.number.add";
  await channel.assertQueue(queue, { durable: true });


  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "USER_NUMBER_ADD") {
        const { mobileNumber, userId } = data.payload;

        if (!mobileNumber || !userId) {
          throw new Error("Mobile number is required");
        }
        await User.findByIdAndUpdate(userId, {
          mobileNumber,
          role: "partner",
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const changeRejectedReason = async () => {
  const channel = await connectRabbitMQ();
  const queue = "partner.rejected.reason";
  await channel.assertQueue(queue, { durable: true });


  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "PARTNER_REJECTED_REASON_REMOVE") {
        const { userId } = data.payload;

        if (!userId) {
          throw new Error("User ID is required");
        }

        await User.findByIdAndUpdate(userId, {
          partnerStatus: "pending",
          rejectedReason: "",
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const setRejectedReason = async () => {
  const channel = await connectRabbitMQ();
  const queue = "partner.rejected.reason.set";
  await channel.assertQueue(queue, { durable: true });


  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "PARTNER_REJECTED_REASON_SET") {
        const { userId, reason } = data.payload;

        if (!userId) {
          throw new Error("User ID is required");
        }

        await User.findByIdAndUpdate(userId, {
          partnerStatus: "pending",
          rejectedReason: reason,
        });
      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const locationUpdateRealTime = async () => {
  const channel = await connectRabbitMQ();
  const queue = "user.location";
  await channel.assertQueue(queue, { durable: true });


  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "USER_LOCATION_UPDATED") {
        const { userId, lat, lon } = data.payload;

        if (!userId) {
          throw new Error("User ID is required");
        }

        

        await User.findByIdAndUpdate(userId, {
          location: {
            type: "Point",
            coordinates: [lon, lat],
          },
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const userStatusConsumer = async () => {
  const channel = await connectRabbitMQ();
  const queue = "user.status";

  await channel.assertQueue(queue, {
    durable: true,
  });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "USER_ONLINE") {
        await User.findByIdAndUpdate(data.payload.userId, {
          isOnline: true,
        });
      }

      if (data.event === "USER_OFFLINE") {
        await User.findByIdAndUpdate(data.payload.userId, {
          isOnline: false,
        });
      }

      channel.ack(msg);
    } catch (error) {
      console.log(error);
      channel.nack(msg, false, false);
    }
  });
};

export const finalApproable = async () => {
  const channel = await connectRabbitMQ();
  const queue = "final-review";

  await channel.assertQueue(queue, {
    durable: true,
  });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "FINAL_REJECT") {
        const { userId, status, onboardingStep, reason } = data.payload;

        await User.findByIdAndUpdate(userId, {
          partnerStatus: status,
          rejectedReason: reason,
          partnerOnboardingSteps: onboardingStep,
        });
      }

      if (data.event === "FINAL_APPROVED") {
        const { userId, status, onboardingStep, reason } = data.payload;

        await User.findByIdAndUpdate(userId, {
          partnerStatus: status,
          rejectedReason: reason,
          partnerOnboardingSteps: onboardingStep,
        });
      }

      channel.ack(msg);
    } catch (error) {
      console.log(error);
      channel.nack(msg, false, false);
    }
  });
};
