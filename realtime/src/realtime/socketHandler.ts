import { Server } from "socket.io";
import { AuthenticatedSocket } from "./socketAuth.js";
import { publishEvent } from "../queues/publisher.js";
import { emitToUser } from "./emitters/emitToUser.js";
import ChatMessage from "../model/chat.model.js";

export const socketHandler = (io: Server) => {
  io.on("connection", async (socket: AuthenticatedSocket) => {
    // personal room
    socket.join(socket.user!._id);
    // user ko es personal room me join kara agar bo labtop mobile dono se login h to dono devices pe same notifications mile

    console.log("Join user", socket.user!._id);

    await publishEvent("user.status", {
      event: "USER_ONLINE",
      payload: {
        userId: socket.user!._id.toString(),
      },
    });

    // event for lat lon update
    socket.on("user:location:update", async ({ lat, lon, timestamp }) => {
      try {
        await publishEvent("user.location", {
          event: "USER_LOCATION_UPDATED",
          payload: {
            userId: socket.user!._id.toString(),
            lat,
            lon,
            timestamp,
          },
        });
      } catch (error) {
        console.log("Queue failed but socket success", error);
      }
    });

    socket.on("SEND_MESSAGE", async ({ receiverId, message, bookingId }) => {
      try {
        io.to(receiverId).emit("RECEIVE_MESSAGE", message);
        await ChatMessage.create({
          bookingId,
          senderId: message.senderId,
          receiverId,
          role: message.role,
          text: message.text,
        });
      } catch (error) {
        console.log(error);
      }
    });

    socket.on(
      "PARTNER_LOCATION_UPDATE",
      ({ userId, bookingId, latitude, longitude }) => {
        try {
          emitToUser(userId, "USER_TRACK_PARTNER_LOCATION", {
            bookingId,
            latitude,
            longitude,
          });
        } catch (error) {
          console.log("PARTNER_LOCATION_UPDATE ERROR", error);
        }
      },
    );

    // disconnect
    socket.on("disconnect", async () => {
      console.log("Disconnected:", socket.user?._id);
      await publishEvent("user.status", {
        event: "USER_OFFLINE",
        payload: {
          userId: socket.user!._id.toString(),
        },
      });
    });
  });
};

// ======================================================
// PERSONAL ROOM EXAMPLE
// ======================================================

/*

Suppose:

User ID = 12345

User login karta hai:

1. Mobile se
2. Laptop se

To dono devices ka alag socket ID hoga:

Mobile Socket:
socket.id = abc111

Laptop Socket:
socket.id = xyz999

But dono same personal room join karenge:

socket.join("12345")

Internally Socket.IO kuch aisa store karta hai:

rooms = {
  "12345": ["abc111", "xyz999"]
}

Ab agar backend ye event emit kare:

io.to("12345").emit("new-notification", {
  message: "Ride Accepted"
});

To:
✅ mobile ko notification milega
✅ laptop ko notification milega

Iska biggest advantage:

Hume socket IDs manage nahi karne padte.
Sirf userId enough hai.

Real-world use cases:

- realtime notifications
- force logout
- ride updates
- video call events
- KYC rejection
- chat messages
- online status

Example:

Admin rejects partner KYC:

io.to(partnerId).emit("video-kyc-rejected");

To partner ke jitne bhi devices connected honge
sab pe realtime event chala jayega.

*/
// ======================================================
