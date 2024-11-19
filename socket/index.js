const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { timeStamp, time } = require("console");
const cron = require("node-cron");
const {
  FlashSales,
  FlashSaleTimerFrame,
  SaleEvents,
} = require("../models/Assosiations");
const { Op } = require("sequelize");
// const {
//   checkStatusOfRequest,
//   updateStatusOfRequest,
// } = require("../controllers/RequestSupportController");
const {
  deleteOrder,
  checkPaid,
  updateBlockStatus,
  checkBlockStatus,
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

  // Cron job chạy mỗi 2 tiếng để kiểm tra cả việc bắt đầu và kết thúc khung giờ flash sale
  cron.schedule("0 */2 * * *", async () => {
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

  cron.schedule("0 0 * * *", async () => {
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

  cron.schedule("0 0 * * *", async () => {
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

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    userSocketMap.delete(userId);
  });
});

module.exports = {
  io,
  app,
  server,
  userSocketMap,
};
