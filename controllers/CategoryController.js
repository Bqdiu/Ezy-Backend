const { model } = require("mongoose");
const {
  SubCategory,
  Category
} = require("../models/Assosiations");

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching Categories: ", error);
    res.status(500).json({ message: error.message || error });
  }
};

const getAllCategoriesWithSubCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: SubCategory,
        }
      ]
    })
    res.status(200).json({
      success: true,
      data: categories,
    })
  } catch (error) {
    res.status(200).json({
      error: true,
      message: error.message || error
    })
  }
}

module.exports = {
  getAllCategories,
  getAllCategoriesWithSubCategories
};
