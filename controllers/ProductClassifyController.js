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


const getClassifyIDsByProductID = async (req, res) => {
  const { product_id } = req.query;
  try {
    const classifyIDs = await ProductClassify.findAll({
      where: { product_id: product_id },
      attributes: ["product_classify_id"],
    });
    res.status(200).json({
      success: true,
      data: classifyIDs,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
}

const updateProductClassify = async (req, res) => {
  const { product_classify_id, product_classify_name, type_name, thumbnail } = req.body;

  if (!product_classify_id) {
    return res.status(400).json({
      success: false,
      message: "product_classify_id is required",
    });
  }

  try {
    const [updated] = await ProductClassify.update(
      {
        product_classify_name,
        type_name,
        thumbnail,
      },
      { where: { product_classify_id } }
    );

    if (updated) {
      const updatedProductClassify = await ProductClassify.findOne({ where: { product_classify_id } });
      return res.status(200).json({
        success: true,
        data: updatedProductClassify,
      });
    }

    res.status(404).json({
      success: false,
      message: "product classify not found",
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || "Some error occurred while updating product classify.",
    });
  }
};

const deleteProductClassify = async (req, res) => {
  const { product_classify_id } = req.body;

  if (!product_classify_id) {
    return res.status(400).json({
      success: false,
      message: "Product classify ID is required.",
    });
  }

  try {
    const deleted = await ProductClassify.destroy({
      where: { product_classify_id },
    });

    if (deleted) {
      return res.status(200).json({
        success: true,
        message: "Product classify deleted successfully.",
      });
    }

    return res.status(404).json({
      success: false,
      message: "Product classify not found.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while deleting the product classify.",
    });
  }
};

const deleteSomeProductClassify = async (req, res) => {
  const { product_classify_ids } = req.body;

  if (!Array.isArray(product_classify_ids) || product_classify_ids.length === 0) {
    return res.status(400).json({ message: "product_classify_ids invalid." });
  }
  const transaction = await ProductClassify.sequelize.transaction();
  try {
    const deleteCount = await ProductClassify.destroy({
      where: { product_classify_id: product_classify_ids },
      transaction
    });

    if (deleteCount === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "No product classifies found to delete"
      });
    }

    await transaction.commit();
    res.status(200).json({
      success: true,
      message: "Delete all product classify successfully"
    });
  } catch (error) {
    await transaction.rollback();

    if (error.original && error.original.errno === 1451) {
      res.status(400).json({
        error: true,
        message: "Cannot delete product classify as it is referenced by other records."
      });
    } else {
      res.status(500).json({
        error: true,
        message: error.message || error
      });
    }
  }
}
const updateClassifyTypeName = async (req, res) => {
  const { product_id, type_name } = req.body;
  if (!product_id || !type_name) {
    return res.status(400).json({ error: true, message: 'Invalid input data' });
  }

  try {
    // Assuming you have a model named ProductClassify
    const result = await ProductClassify.update(
      { type_name: type_name },
      { where: { product_id: product_id } }
    );

    if (result[0] === 0) {
      return res.status(404).json({ error: true, message: 'Product classify not found' });
    }
    return res.status(200).json({ success: true, message: 'Type name updated successfully' });
  } catch (error) {
    console.error('Error updating type name:', error);
    return res.status(500).json({ error: true, message: 'Server error' });
  }
}

module.exports = {
  getAllProductClassify,
  getProductClassifyByProductID,
  addProductClassify,
  getClassifyIDsByProductID,
  updateProductClassify,
  deleteProductClassify,
  deleteSomeProductClassify,
  updateClassifyTypeName
};
