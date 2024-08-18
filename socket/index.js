const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const getConversation = require("../helpers/getConversation");

const app = express();
//**Socket Connection */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});
//online user
const onlineUser = new Set();

//**Socket running at http://localhost:8080 */

io.on("connection", async (socket) => {
  console.log("connect user", socket.id);

  const token = socket.handshake.auth.token;
  //current user
  const user = await getUserDetailsFromToken(token);

  //create a room
  socket.join(user?._id?.toString());
  onlineUser.add(user?._id?.toString());
  console.log(onlineUser);

  

  //Left Chatbox
  socket.on("sidebar", async (currentUserID) => {
    console.log("Current User", currentUserID);
    const conversation = await getConversation(currentUserID);
    socket.emit("conversation", conversation);
  });

  //***disconnect */
  socket.on("disconnect", () => {
    onlineUser.delete(user?._id?.toString());
    console.log("disconnect user ", socket.id);
  });
});

module.exports = {
  app,
  server,
};
