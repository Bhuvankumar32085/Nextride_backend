import { connectRabbitMQ } from "../queues/rabbitmq.js";
import { emitToUser } from "../realtime/emitters/emitToUser.js";

export const videoKycStarted = async () => {
  const channel = await connectRabbitMQ();
  const queue = "video-kyc-started";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "VIDEO_KYC_STARTED") {
        const { userId, partner } = data.payload;


        emitToUser(userId, "VIDEO_KYC_STARTED", {
          message: "Your video KYC process has started.",
          partner,
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const videoKycResult = async () => {
  const channel = await connectRabbitMQ();
  const queue = "video-kyc-result";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "VIDEO_KYC_RESULT") {
        const { userId, partner } = data.payload;


        emitToUser(userId, "VIDEO_KYC_RESULT", {
          message: "Your video KYC process has been completed.",
          partner,
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const videoKycResultForAdmin = async () => {
  const channel = await connectRabbitMQ();
  const queue = "video-kyc-result-admin";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "VIDEO_KYC_RESULT_ADMIN") {
        const { userId, partner } = data.payload;


        emitToUser(userId, "VIDEO_KYC_RESULT_ADMIN", {
          message: "Your video KYC process has been completed.",
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};

export const videoKysReApply = async () => {
  const channel = await connectRabbitMQ();
  const queue = "video-kyc-reapply";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "VIDEO_KYC_REAPPLY") {
        const { userId } = data.payload;


        emitToUser(userId, "VIDEO_KYC_REAPPLY", {
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

export const finalReviewRejectionOrApproval = async () => {
  const channel = await connectRabbitMQ();
  const queue = "video-kyc-final-review";
  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Video KYC service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "VIDEO_KYC_FINAL_REVIEW_RESULT") {
        const { userId, status, onboardingStep, reason } = data.payload;

        console.log(
          `📢 Emitting VIDEO_KYC_FINAL_REVIEW_RESULT to user ${userId}`,
        );

        emitToUser(userId, "VIDEO_KYC_FINAL_REVIEW_RESULT", {
          message: "Your video KYC final review result is available.",
          status,
          onboardingStep,
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
