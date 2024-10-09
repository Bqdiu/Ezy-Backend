const { Sequelize } = require("sequelize");
const { Product, ProductClassify } = require("../models/Assosiations");

const sequelize = require("../config/database");

const getAllProductClassify = async (req, res) => {
  try {
    const productClassify = await ProductClassify.findAll();
    res.status(200).json({
      success: true,
      data: productClassify,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getProductClassifyByProductID = async (req, res) => {
  try {
    const { product_id } = req.query;
    const productClassify = await ProductClassify.findAll({
      where: { product_id: product_id },
      include: [
        {
          model: Product,
          attributes: ["product_id", "product_name"],
        },
      ],
    });
    const totalStockQuery = `SELECT product_classify_id,SUM(stock) as total_stock from product_varients where product_varients.product_classify_id in 
    (SELECT product_classify_id from product_classify where product_id = ${product_id})
    group by product_classify_id;`;

    const totalStock = await sequelize.query(totalStockQuery, {
      replacements: { product_id: product_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    productClassify.forEach((item) => {
      const data = totalStock.find(
        (stockItem) =>
          stockItem.product_classify_id === item.product_classify_id
      );
      item.dataValues.total_stock = data?.total_stock || 0;
    });

    res.status(200).json({
      success: true,
      data: productClassify,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const addProductClassify = async (req, res) => {
  const { product_id, product_classify_name, type_name, thumbnail } = req.body;
  try {
    const product_classify = await ProductClassify.create({
      product_id: product_id,
      product_classify_name: product_classify_name,
      type_name: type_name,
      thumbnail: thumbnail,
    });
    res.status(200).json({
      success: true,
      data: product_classify,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = {
  getAllProductClassify,
  getProductClassifyByProductID,
  addProductClassify,
};
