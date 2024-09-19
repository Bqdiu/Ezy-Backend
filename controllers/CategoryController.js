const Category = require("../models/Category");

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching Categories: ", error);
    res.status(500).json({ message: error.message || error });
  }
};

module.exports = {
  getAllCategories,
};
