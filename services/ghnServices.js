const axios = require("axios");

const getOrderDetailGHN = async (orderCode) => {
  try {
    const url =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail";
    const res = await axios({
      method: "POST",
      url: url,
      headers: {
        Token: `${process.env.REACT_APP_GHV_KEY_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        order_code: orderCode,
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

const createOrderGHN = async (shopId, data) => {
  const url =
    "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create";
  try {
    const res = await axios({
      method: "POST",
      url: url,
      headers: {
        Token: `${process.env.REACT_APP_GHV_KEY_TOKEN}`,
        ShopId: shopId,
        "Content-Type": "application/json",
      },
      data,
    });
    return res.data;
  } catch (error) {
    // 
    console.log(error.message);
    return error;
  }
};


const cancelOrderGHN = async (shopId, orderCode) => {
  try {
    const url =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel";
    const res = await axios({
      method: "POST",
      url: url,
      headers: {
        Token: `${process.env.REACT_APP_GHV_KEY_TOKEN}`,
        ShopId: shopId,
        "Content-Type": "application/json",
      },
      data: {
        order_codes: orderCode, // require array of order code
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.message);
  }
};


module.exports = { 
  getOrderDetailGHN,
  createOrderGHN,
  cancelOrderGHN
};
