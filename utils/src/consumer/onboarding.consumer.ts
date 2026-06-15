import { connectRabbitMQ } from "../configs/rabbitmq.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const { CLOUDINARTY_CLOUD_NAME, CLOUDINARTY_API_KEY, CLOUDINARTY_API_SECRET } =
  process.env;

if (
  !CLOUDINARTY_CLOUD_NAME ||
  !CLOUDINARTY_API_KEY ||
  !CLOUDINARTY_API_SECRET
) {
  console.error(
    "Cloudinary configuration is missing. Please set CLOUDINARTY_CLOUD_NAME, CLOUDINARTY_API_KEY, and CLOUDINARTY_API_SECRET in your environment variables.",
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARTY_CLOUD_NAME,
  api_key: CLOUDINARTY_API_KEY,
  api_secret: CLOUDINARTY_API_SECRET,
});

export const startOnboardingConsumer = async () => {
  const channel = await connectRabbitMQ();

  const queue = "media.delete";

  await channel.assertQueue(queue, { durable: true });

  console.log("📥 Auth service listening...");

  channel.consume(queue, async (msg) => {
    if (!msg) return;


    try {
      const data = JSON.parse(msg.content.toString());

      if (data.event === "PARTNER_ONBOARDING_DELETE_OLD_DOCS") {
        const { userId, publicIds } = data.payload;


        const result = await cloudinary.api.delete_resources(publicIds);


      }

      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error:", err);
      channel.nack(msg, false, false);
    }
  });
};
