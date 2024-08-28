const { ConversationModel } = require("../models/ConversationModel");
const mongoose = require("mongoose");
const getConversation = async (currentUserID) => {
  if (currentUserID) {
    const currentUserConversation = await ConversationModel.find({
      $or: [{ sender: currentUserID }, { receiver: currentUserID }],
    })
      .sort({ updatedAt: -1 })
      .populate("messages")
      .populate("sender")
      .populate("receiver");

    const conversation = currentUserConversation.map((conv) => {
      const countUnseenMsg = conv.messages.reduce((preve, curr) => {
        const msgByUserID = curr?.msgByUserID.toString();
        if (msgByUserID !== currentUserID && !curr.seen) {
          return preve + 1;
        } else {
          return preve;
        }
      }, 0);

      return {
        _id: conv?._id,
        sender: conv?.sender,
        receiver: conv?.receiver,
        unseenMsg: countUnseenMsg,
        lastMsg: conv.messages[conv?.messages?.length - 1],
      };
    });
    return conversation;
  } else {
    return [];
  }
};

const countTotalUnseenMessage = async (currentUserID) => {
  try {
    const result = await ConversationModel.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(currentUserID) },
            { receiver: new mongoose.Types.ObjectId(currentUserID) },
          ],
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "messages",
          foreignField: "_id",
          as: "messages",
        },
      },
      {
        $unwind: "$messages",
      },
      {
        $sort: { "messages.createdAt": 1 },
      },
      { $group: { _id: "$_id", messages: { $push: "$messages" } } },

      {
        $addFields: {
          lastMsg: { $arrayElemAt: ["$messages", -1] },
        },
      },
      {
        $match: {
          "lastMsg.seen": false,
          "lastMsg.reiceiverID": new mongoose.Types.ObjectId(currentUserID),
        },
      },
      {
        $count: "unseenConversationCount",
      },
    ]);

    return result.length > 0 ? result[0].unseenConversationCount : 0;
  } catch (error) {
    console.log(error);
    return 0;
  }
};

module.exports = { getConversation, countTotalUnseenMessage };
