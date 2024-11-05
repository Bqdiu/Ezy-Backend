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

module.exports = { getOrderDetailGHN };
