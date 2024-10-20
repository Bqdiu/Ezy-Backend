const { model } = require("mongoose");
const { SubCategory, Category, Product } = require("../models/Assosiations");
const sequelize = require("../config/database");

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching Categories: ", error);
    res.status(500).json({ message: error.message || error });
  }
};

const getSubCategories = async (req, res) => {
  const { category_id } = req.params;
  try {
    if (category_id) {
      const subCategories = await SubCategory.findAll({
        where: {
          category_id,
        },
      });
      const totalProductEverySubCategoryQuery = `SELECT sub_category.sub_category_id, count(product.product_id) as totalProduct FROM sub_category inner join product on product.sub_category_id = sub_category.sub_category_id WHERE sub_category.category_id = ${category_id} group by sub_category_id;`;

      const totalProductEverySubCategory = await sequelize.query(
        totalProductEverySubCategoryQuery,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );

      subCategories.forEach((subCategory) => {
        if (totalProductEverySubCategory.length > 0) {
          const found = totalProductEverySubCategory.find(
            (item) => item.sub_category_id === subCategory.sub_category_id
          );
          if (found) {
            subCategory.dataValues.totalProduct = found.totalProduct;
          } else {
            subCategory.dataValues.totalProduct = 0;
          }
        }
      });

      subCategories.sort((a, b) =>
        b.dataValues.totalProduct > a.dataValues.totalProduct ? 0 : -1
      );

      res.status(200).json({
        success: true,
        subCategories,
      });
    } else {
      res.status(400).json({ error: true, message: "Category_id is required" });
    }
  } catch (error) {
    console.error("Error fetching SubCategories: ", error);
    res.status(500).json({ error: true, message: error.message || error });
  }
};

const getAllCategoriesWithSubCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: SubCategory,
        },
      ],
    });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getCategoriesName = async (req, res) => {
  try {
    const { category_id } = req.params;
    const categories = await Category.findAll({
      attributes: ["category_id", "category_name"],
      where: {
        category_id,
      },
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.log("Lỗi khi fetch category name: ", error);
    res.status(500).json({ error: true, message: error.message || error });
  }
};

const addCategory = async (req, res) => {
  const { category_name, thumbnail } = req.body;
  try {
    const newCategory = await Category.create({
      category_name: category_name,
      thumbnail: thumbnail,
    });
    res.status(201).json({
      success: true,
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
}

const getCategoriesByShop = async (req, res) => {
  const { shop_id } = req.query;
  try {
    const categories = await Category.findAll({
      attributes: {
        exclude: ["thumbnail"],
      },
      include: [
        {
          model: SubCategory,
          required: true,
          include: [
            {
              model: Product,
              where: {
                shop_id: shop_id,
              },
            },
          ]
        },
      ],
    });
    if (categories.length === 0) {
      res.status(404).json({
        success: false,
        message: "No categories found",
      });
    }
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
module.exports = {
  getAllCategories,
  getAllCategoriesWithSubCategories,
  getSubCategories,
  getCategoriesName,
  addCategory,
  getCategoriesByShop
};
