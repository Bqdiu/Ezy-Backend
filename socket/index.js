// const express = require("express");
// const { Server } = require("socket.io");
// const http = require("http");
// const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
// const getConversation = require("../helpers/getConversation");
// const UserModel = require("../models/UserModel");
// const {
//   ConversationModel,
//   MessageModel,
// } = require("../models/ConversationModel");

// const app = express();
// //**Socket Connection */
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//   },
// });

// //online user
// const onlineUser = new Set();

// //**Socket running at http://localhost:8080 */

// io.on("connection", async (socket) => {
//   console.log("connect user", socket.id);

//   const token = socket.handshake.auth.token;
//   //current user
//   const user = await getUserDetailsFromToken(token);

//   //create a room
//   socket.join(user?._id?.toString());
//   onlineUser.add(user?._id?.toString());
//   console.log(onlineUser);

//   //Left Chatbox
//   socket.on("sidebar", async (currentUserID) => {
//     console.log("Current User", currentUserID);
//     const conversation = await getConversation.getConversation(currentUserID);
//     socket.emit("conversation", conversation);
//   });
//   //message-Section
//   socket.on("message-section", async (userID) => {
//     try {
//       console.log("UserID", userID);
//       const userDetails = await UserModel.findById(userID).select("-password");

//       const payload = {
//         _id: userDetails?._id,
//         name: userDetails?.name,
//         username: userDetails?.username,
//         email: userDetails?.email,
//         phoneNumber: userDetails?.phoneNumber,
//         profile_pic: userDetails?.profile_pic,
//       };

//       socket.emit("message-user", payload || undefined);

//       // Lấy cuộc trò chuyện và tin nhắn
//       const getConversationMessage = await ConversationModel.findOne({
//         $or: [
//           { sender: user?._id, receiver: userID },
//           { sender: userID, receiver: user?._id },
//         ],
//       })
//         .populate("messages")
//         .sort({ updatedAt: -1 });

//       socket.emit("message", getConversationMessage?.messages || []);
//     } catch (error) {
//       console.error("Error fetching messages:", error);
//     }
//   });

//   //New-message
//   socket.on("new-message", async (data) => {
//     try {
//       // Kiểm tra cuộc hội thoại có sẵn không
//       let conversation = await ConversationModel.findOne({
//         $or: [
//           { sender: data?.sender, receiver: data?.receiver },
//           { sender: data?.receiver, receiver: data?.sender },
//         ],
//       });

//       // Nếu không có, tạo mới và lưu vào DB
//       if (!conversation) {
//         const createConversation = new ConversationModel({
//           sender: data?.sender,
//           receiver: data?.receiver,
//         });
//         conversation = await createConversation.save();
//       }

//       // Tạo và lưu tin nhắn mới
//       const message = new MessageModel({
//         text: data?.text,
//         imageUrl: data?.imageUrl,
//         videoUrl: data?.videoUrl,
//         reiceiverID: data?.receiver,
//         msgByUserID: data?.msgByUserID,
//       });
//       const saveMessage = await message.save();

//       // Cập nhật cuộc hội thoại với tin nhắn mới
//       await ConversationModel.updateOne(
//         { _id: conversation._id },
//         { $push: { messages: saveMessage._id } }
//       );
//       const getConversationMessage = await ConversationModel.findOne({
//         $or: [
//           { sender: data?.sender, receiver: data?.receiver },
//           { sender: data?.receiver, receiver: data?.sender },
//         ],
//       })
//         .populate("messages")
//         .sort({ updatedAt: -1 });

//       io.to(data?.sender).emit(
//         "message",
//         getConversationMessage.messages || []
//       );
//       io.to(data?.receiver).emit(
//         "message",
//         getConversationMessage.messages || []
//       );

//       const conversationSender = await getConversation.getConversation(
//         data?.sender
//       );
//       const conversationReceiver = await getConversation.getConversation(
//         data?.receiver
//       );
//       io.to(data?.sender).emit("conversation", conversationSender);
//       io.to(data?.receiver).emit("conversation", conversationReceiver);
//       const countTotalMessageSender =
//         await getConversation.countTotalUnseenMessage(data?.sender.toString());
//       const countTotalMessageReceiver =
//         await getConversation.countTotalUnseenMessage(
//           data?.receiver.toString()
//         );
//       console.log(countTotalMessageSender);
//       console.log(countTotalMessageReceiver);
//       io.to(data?.sender).emit("total-unseen-message", countTotalMessageSender);
//       io.to(data?.receiver).emit(
//         "total-unseen-message",
//         countTotalMessageReceiver
//       );
//     } catch (error) {
//       console.error("Error handling new message:", error);
//     }
//   });
//   socket.on("seen", async (msgByUserID) => {
//     const conversation = await ConversationModel.findOne({
//       $or: [
//         { sender: user?._id, receiver: msgByUserID },
//         { sender: msgByUserID, receiver: user?._id },
//       ],
//     });

//     const conversationMessageID = conversation?.messages || [];
//     const updatedMessages = await MessageModel.updateMany(
//       {
//         _id: { $in: conversationMessageID },
//         msgByUserID: msgByUserID,
//       },
//       {
//         $set: { seen: true },
//       }
//     );

//     //send conversation
//     const conversationSender = await getConversation.getConversation(user?._id);
//     const conversationReceiver = await getConversation.getConversation(
//       msgByUserID
//     );

//     io.to(user?._id?.toString()).emit("conversation", conversationSender);
//     io.to(msgByUserID).emit("conversation", conversationReceiver);

//     // const countTotalMessageSender =
//     //   await getConversation.countTotalUnseenMessage(user?._id);
//     const countTotalMessageReceiver =
//       await getConversation.countTotalUnseenMessage(user?._id.toString());
//     // console.log(countTotalMessageReceiver);
//     // console.log(countTotalMessageReceiver);
//     // io.to(user?._id).emit("total-unseen-message", countTotalMessageSender);
//     io.to(user?._id.toString()).emit(
//       "total-unseen-message",
//       countTotalMessageReceiver
//     );
//   });

//   socket.on("count-unseen-message", async (msgByUserID) => {
//     const totalUnseenMessages = await getConversation.countTotalUnseenMessage(
//       msgByUserID
//     );
//     socket.emit("total-unseen-message", totalUnseenMessages);
//   });
//   //***disconnect */
//   socket.on("disconnect", () => {
//     onlineUser.delete(user?._id?.toString());
//     console.log("disconnect user ", socket.id);
//   });
// });

// module.exports = {
//   app,
//   server,
// };
