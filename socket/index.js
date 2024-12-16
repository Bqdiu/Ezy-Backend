const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { timeStamp, time } = require("console");
const cron = require("node-cron");
const admin = require("firebase-admin");
const {
  FlashSales,
  FlashSaleTimerFrame,
  SaleEvents,
  SaleEventsUser,
  UserAccount,
  RequestSupports,
  UserOrder,
  Shop,
  UserWallet,
  WalletTransaction,
} = require("../models/Assosiations");

const { Op, fn, col } = require("sequelize");
// const {
//   checkStatusOfRequest,
//   updateStatusOfRequest,
// } = require("../controllers/RequestSupportController");
const {
  deleteOrder,
  checkPaid,
  updateBlockStatus,
  checkBlockStatus,
  processOrdersInBatches,
} = require("../controllers/UserOrderController");

const {
  activateEvents,
  deactivateEvents,
} = require("../controllers/SaleEventController");

const app = express();
//**Socket Connection */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

let orders = {};
const userSocketMap = new Map();
io.on("connection", (socket) => {
  const userId = socket.handshake.query.user_id; // Lấy user ID từ query params
  if (userId) {
    userSocketMap.set(userId, socket.id);
  }
  console.log("New client connected");
  console.log("userSocketMap", userSocketMap);

  socket.on("cancelOrder", async (data) => {
    console.log("cancelOrder", data);
    const { orderID, selectedVoucher, timeStamp } = data;
    const timeStampMs = new Date(timeStamp).getTime();
    if (isNaN(timeStampMs)) {
      console.error("Invalid timeStamp format:", timeStamp); // In log nếu `timeStamp` không hợp lệ
      return;
    }
    const interval = setInterval(async () => {
      const timeLeft = Date.now() - timeStampMs;

      console.log("timeLeft: ", timeLeft);
      if (timeLeft >= 2 * 60 * 1000) {
        const isNotPaid = await checkPaid(orderID);
        const isUnBlocked = await checkBlockStatus(orderID);
        if (isNotPaid) {
          if (isUnBlocked) {
            await deleteOrder(orderID, selectedVoucher);
            console.log(
              `Đơn hàng ${orderID} đã bị xóa do chưa thanh toán và chỉ có trạng thái "Chờ thanh toán".`
            );
            clearInterval(interval);
          } else {
            console.log(`Đơn hàng ${orderID} đã bị chặn, không xóa.`);
          }
        } else {
          clearInterval(interval);
          console.log(`Đơn hàng ${orderID} đã có trạng thái khác, không xóa.`);
        }
      }
    }, 60000);
  });

  socket.on("updateBlockStatus", async (data) => {
    const { orderID, timeStamp } = data;
    const timeStampMs = new Date(timeStamp).getTime();
    if (isNaN(timeStampMs)) {
      console.error("Invalid timeStamp format:", timeStamp);
      return;
    }
    const delay = 1 * 60 * 1000; // 1 phút
    setTimeout(async () => {
      const isUpdated = await updateBlockStatus(orderID);

      if (isUpdated) {
        console.log(`Đơn hàng ${orderID} đã cập nhật trạng thái thành công.`);
      } else {
        console.log(`Đơn hàng ${orderID} không thể cập nhật trạng thái.`);
      }
    }, delay);
  });

  socket.on("followNewSupportRequest", async (data) => {
    const { request_support_id, requestor_id, time } = data;
    const delay = 2 * 60 * 1000; // 2 phút
    setTimeout(async () => {
      const isWaiting = await checkStatusOfRequest(request_support_id);
      if (isWaiting) {
        const isClosed = await updateStatusOfRequest(request_support_id);
        if (isClosed) {
          console.log(
            `Yêu cầu hỗ trợ ${request_support_id} của ${requestor_id} đã được đóng.`
          );
          io.to(userSocketMap.get(requestor_id)).emit("supportRequestClosed", {
            message: "Yêu cầu của bạn đã quá hạn",
          });
        } else {
          console.log(
            `Không thể đóng yêu cầu hỗ trợ ${request_support_id} của ${requestor_id}.`
          );
        }
      }
    }, delay);
  });

  // Cron job chạy mỗi 2 tiếng để kiểm tra cả việc bắt đầu và kết thúc khung giờ flash sale
  cron.schedule("* * * * *", async () => {
    //cron.schedule("0 */2 * * *", async () => {
    try {
      const currentTime = new Date();

      // Tìm các khung giờ flash sale cần bắt đầu
      const timeFramesToStart = await FlashSaleTimerFrame.findAll({
        where: {
          started_at: { [Op.lte]: currentTime },
          ended_at: { [Op.gt]: currentTime },
          status: "waiting",
        },
      });

      for (const timeFrame of timeFramesToStart) {
        timeFrame.status = "active";
        await timeFrame.save();

        console.log(
          `Khung giờ ${timeFrame.flash_sale_time_frame_id} đã bắt đầu`
        );
        io.emit("flashSaleTimeFrameStarted", {
          timeFrameId: timeFrame.flash_sale_time_frame_id,
        });
      }

      // Tìm các khung giờ flash sale cần kết thúc
      const timeFramesToEnd = await FlashSaleTimerFrame.findAll({
        where: {
          ended_at: { [Op.lte]: currentTime },
          status: "active",
        },
      });

      for (const timeFrame of timeFramesToEnd) {
        timeFrame.status = "ended";
        await timeFrame.save();

        console.log(
          `Khung giờ ${timeFrame.flash_sale_time_frame_id} đã kết thúc`
        );
        io.emit("flashSaleTimeFrameEnded", {
          timeFrameId: timeFrame.flash_sale_time_frame_id,
        });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật khung giờ flash sale:", error);
    }
  });

  cron.schedule("* * * * *", async () => {
    //cron.schedule("0 0 * * *", async () => {
    try {
      const currentTime = new Date();

      // Tìm các flash sale cần bắt đầu trong ngày hiện tại
      const flashSalesToStart = await FlashSales.findAll({
        where: {
          started_at: { [Op.lte]: currentTime },
          ended_at: { [Op.gt]: currentTime },
          status: "waiting",
        },
      });

      for (const flashSale of flashSalesToStart) {
        flashSale.status = "active";
        await flashSale.save();

        console.log(`Flash sale ${flashSale.flash_sales_id} đã bắt đầu.`);
        io.emit("flashSaleStarted", { flashSaleId: flashSale.flash_sales_id });
      }

      const flashSalesToEnd = await FlashSales.findAll({
        where: {
          ended_at: { [Op.lte]: currentTime },
          status: "active",
        },
      });

      for (const flashSale of flashSalesToEnd) {
        flashSale.status = "ended";
        await flashSale.save();

        console.log(`Flash sale ${flashSale.flash_sales_id} đã kết thúc.`);
        io.emit("flashSaleEnded", { flashSaleId: flashSale.flash_sales_id });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái flash sale:", error);
    }
  });

  cron.schedule("* * * * *", async () => {
    //cron.schedule("0 0 * * *", async () => {
    try {
      const currentTime = new Date();

      // Find events that need to be activated today
      const eventsToStart = await SaleEvents.findAll({
        where: {
          started_at: { [Op.lte]: currentTime },
          ended_at: { [Op.gt]: currentTime },
          is_actived: false,
        },
      });

      for (const event of eventsToStart) {
        event.is_actived = true;
        await event.save();

        console.log(`Sale event ${event.sale_events_id} has started.`);

        //find all users with role_id = 1
        const users = await UserAccount.findAll({
          where: { role_id: 1 },
          attributes: ["user_id"],
        });

        //Add all users to SaleEventsUser table
        const saleEventUsers = users.map((user) => ({
          user_id: user.user_id,
          sale_events_id: event.sale_events_id,
        }));

        await SaleEventsUser.bulkCreate(saleEventUsers);

        io.emit("saleEventStarted", { saleEventId: event.sale_events_id });
      }

      // Find events that need to be deactivated today
      const eventsToEnd = await SaleEvents.findAll({
        where: {
          ended_at: { [Op.lte]: currentTime },
          is_actived: true,
        },
      });

      for (const event of eventsToEnd) {
        event.is_actived = false;
        await event.save();

        console.log(`Sale event ${event.sale_events_id} has ended.`);
        io.emit("saleEventEnded", { saleEventId: event.sale_events_id });
      }
    } catch (error) {
      console.error("Error updating SaleEvents statuses:", error);
    }
  });

  // Cron job chạy mỗi giờ để kiểm tra các tài khoản cần mở khóa
  cron.schedule("0 */1 * * *", async () => {
    console.log("Đang kiểm tra các tài khoản cần mở khóa...");
    const currentTime = new Date();

    try {
      const accountsToUnlock = await UserAccount.findAll({
        where: {
          is_banned: 1, // Tài khoản đang bị khóa
          ban_until: { [Op.lte]: currentTime }, // Đã đến thời điểm mở khóa
          ban_until: { [Op.not]: null }, // Loại bỏ tài khoản bị cấm vĩnh viễn
        },
      });

      for (const account of accountsToUnlock) {
        account.is_banned = 0; // Gỡ trạng thái khóa
        account.ban_until = null; // Xóa thời điểm mở khóa
        await account.save();

        // Kích hoạt tài khoản trên Firebase
        try {
          await admin.auth().updateUser(account.user_id, { disabled: false });
          console.log(
            `Tài khoản Firebase ${account.user_id} đã được kích hoạt.`
          );
        } catch (firebaseError) {
          console.error(
            `Lỗi kích hoạt tài khoản Firebase ${account.user_id}:`,
            firebaseError.message
          );
        }

        console.log(`Tài khoản ${account.user_id} đã được mở khóa.`);
      }

      console.log("Hoàn tất kiểm tra.");
    } catch (error) {
      console.error("Lỗi kiểm tra tài khoản cần mở khóa:", error.message);
    }
  });

  // * * * * *: 1 phút
  // 0 0 * * * : 0h mỗi ngày
  cron.schedule("0 0 * * *", async () => {
    console.log("Processing orders in batches...");
    try {
      await processOrdersInBatches(10); // Xử lý mỗi lô 10 đơn hàng
    } catch (error) {
      console.error("Lỗi trong quá trình xử lý đơn hàng:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    userSocketMap.delete(userId);
  });
});

const checkStatusOfRequest = async (request_support_id) => {
  try {
    const requestSupport = await RequestSupports.findOne({
      where: { request_support_id: request_support_id },
    });
    if (!requestSupport) {
      console.error(`Request with ID ${request_support_id} not found.`);
      return false;
    }
    return requestSupport.status === "waiting";
  } catch (error) {
    console.error("Error checking status of request:", error);
    return false;
  }
};

const updateStatusOfRequest = async (request_support_id) => {
  try {
    const requestSupport = await RequestSupports.findOne({
      where: { request_support_id: request_support_id },
    });
    if (!requestSupport) {
      console.error(`Request with ID ${request_support_id} not found.`);
      return false;
    }
    await requestSupport.update({
      status: "closed",
    });
    return true;
  } catch (error) {
    console.error("Error updating status of request:", error);
    return false;
  }
};

// Cron job chạy hàng tuần vào 0h thứ 2
cron.schedule("* * * * *", async () => {
  // cron.schedule("0 0 * * 1", async () => {
  console.log("Running weekly shop revenue distribution...");

  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  try {
    // Fetch all shops
    const shops = await Shop.findAll({
      include: [
        {
          model: UserAccount,
          where: { role_id: 2 },
        },
      ],
    });

    for (const shop of shops) {
      const shopId = shop.shop_id;
      const ownerId = shop.UserAccount.user_id;

      // Fetch pending orders for this shop
      const pendingOrders = await UserOrder.findAll({
        where: {
          shop_id: shopId,
          order_status_id: 5,
          [Op.or]: [
            {
              return_expiration_date: {
                [Op.lt]: today,
              },
            },
          ],
          created_at: {
            [Op.between]: [fourteenDaysAgo, today],
          },
          is_pending_payout: 1,
        },
      });

      // Calculate total revenue
      const totalRevenue = pendingOrders.reduce(
        (sum, order) => sum + parseFloat(order.total_price),
        0
      );
      const netRevenue = totalRevenue * 0.96; // Deduct platform fee (4%)

      if (netRevenue > 0) {
        // Update wallet balance
        const wallet = await UserWallet.findOne({
          where: { user_id: ownerId },
        });
        if (wallet) {
          wallet.balance += netRevenue;
          await wallet.save();

          // Log the transaction
          await WalletTransaction.create({
            user_wallet_id: wallet.user_wallet_id,
            transaction_type: "Doanh thu",
            amount: netRevenue,
            description: "Doanh thu cửa hàng từ đơn hàng trong 14 ngày qua",
          });

          console.log(
            `Transferred ${netRevenue} to shop owner ${ownerId} for shop ${shopId}.`
          );
        } else {
          console.error(`Wallet not found for shop owner ${ownerId}.`);
        }

        // Mark orders as processed
        await UserOrder.update(
          { is_pending_payout: 0 },
          {
            where: {
              shop_id: shopId,
              order_status_id: 5,
              [Op.or]: [
                {
                  return_expiration_date: {
                    [Op.lt]: today,
                  },
                },
              ],
              created_at: {
                [Op.between]: [fourteenDaysAgo, today],
              },
              is_pending_payout: 1,
            },
          }
        );

        console.log(
          `Marked ${pendingOrders.length} orders as processed for shop ${shopId}.`
        );
      } else {
        console.log(
          `No revenue to transfer for shop ${shopId} (Owner: ${ownerId})`
        );
      }
    }

    console.log("Weekly shop revenue distribution completed.");
  } catch (error) {
    console.error("Error in weekly revenue distribution:", error);
  }
});

//Tự động duy trì sự kiện chào mừng khách hàng mới
//cron.schedule("* * * * *", async () => {
cron.schedule("0 * * * *", async () => {
  try {
    const currentTime = new Date();

    // Fetch the event with ID = 1
    const saleEvent = await SaleEvents.findOne({
      where: { sale_events_id: 1 },
    });

    if (saleEvent) {
      const timeLeft = new Date(saleEvent.ended_at) - currentTime;

      // If the event is about to end in less than 24 hours
      if (timeLeft < 24 * 60 * 60 * 1000 && timeLeft > 0) {
        const newEndDate = new Date(saleEvent.ended_at);
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await saleEvent.update({ ended_at: newEndDate });

        console.log(
          `Sale event with ID ${saleEvent.sale_events_id} has been extended to ${newEndDate}.`
        );

        // Emit a socket event to notify clients about the update
        io.emit("saleEventUpdated", {
          saleEventId: saleEvent.sale_events_id,
          newEndDate,
        });
      }
    } else {
      console.log("No sale event with ID = 1 found.");
    }
  } catch (error) {
    console.error("Error extending sale event end date:", error);
  }
});

module.exports = {
  io,
  app,
  server,
  userSocketMap,
};
