const {
    SaleEvents,
    Shop,
    DiscountVoucher,
    SaleEventsOnCategories,
    ShopRegisterEvents,
    Category,
    Product,
    SubCategory,
} = require("../models/Assosiations");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const getAllSaleEvents = async (req, res) => {
    try {
        const saleEvents = await SaleEvents.findAll();
        res.status(200).json({
            success: true,
            data: saleEvents
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}
const addSaleEvent = async (req, res) => {
    const { sale_events_name, thumbnail, started_at, ended_at } = req.body;
  
    try {
      // Kiểm tra đầu vào
      if (!sale_events_name || !started_at || !ended_at) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp đầy đủ thông tin: tên sự kiện, ngày bắt đầu và ngày kết thúc.",
        });
      }
  
      const startDate = new Date(started_at);
      const endDate = new Date(ended_at);
      const now = new Date();
  
      // Kiểm tra thời gian bắt đầu phải là 00:00:00
      if (
        startDate.getHours() !== 0 ||
        startDate.getMinutes() !== 0 ||
        startDate.getSeconds() !== 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Thời gian bắt đầu phải là 00:00:00.",
        });
      }
  
      // Kiểm tra thời gian kết thúc phải là 23:00:00
      if (
        endDate.getHours() !== 23 ||
        endDate.getMinutes() !== 59 ||
        endDate.getSeconds() !== 59
      ) {
        return res.status(400).json({
          success: false,
          message: "Thời gian kết thúc phải là 23:59:59.",
        });
      }
  
      // Kiểm tra ngày bắt đầu nhỏ hơn ngày kết thúc
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu phải nhỏ hơn ngày kết thúc.",
        });
      }
  
      // Kiểm tra ngày bắt đầu không nằm trong quá khứ
      if (startDate < now) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu phải sau ngày hiện tại.",
        });
      }
  
      // Kiểm tra khoảng cách giữa ngày bắt đầu và ngày kết thúc
      const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24); // Tính khoảng cách theo ngày
      if (diffInDays > 30) {
        return res.status(400).json({
          success: false,
          message: "Khoảng thời gian của sự kiện không được vượt quá 30 ngày.",
        });
      }
  
      // Tạo sự kiện mới
      const newSaleEvent = await SaleEvents.create({
        sale_events_name,
        thumbnail: thumbnail || null,
        started_at: startDate,
        ended_at: endDate,
      });
  
      res.status(201).json({
        success: true,
        data: newSaleEvent,
        message: "Tạo sự kiện thành công",
      });
    } catch (error) {
      console.error("Lỗi khi tạo sự kiện:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo sự kiện",
        error: error.message,
      });
    }
  };
  
const deleteSaleEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy'
            });
        }

        const currentDate = new Date();
        const eventStartDate = new Date(saleEvent.started_at);

        if (currentDate > eventStartDate) {
            return res.status(403).json({
                success: false,
                message: 'Không thể xóa sự kiện đã bắt đầu hoặc đã kết thúc'
            });
        }

        await SaleEventsOnCategories.destroy({ where: { sale_events_id: id } });

        await SaleEvents.destroy({ where: { sale_events_id: id } });

        res.status(200).json({
            success: true,
            message: 'Xóa sự kiện thành công và đã xóa tất cả danh mục liên quan'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa sự kiện',
            error: error.message,
        });
    }
};
const addCategoriesToEvent = async (req, res) => {
    const { id } = req.params;
    const { category_ids } = req.body;

    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy'
            });
        }

        // Lấy danh sách danh mục hiện tại của sự kiện
        const existingCategories = await SaleEventsOnCategories.findAll({
            where: { sale_events_id: id },
            attributes: ["category_id"],
        });

        const existingCategoryIds = existingCategories.map(category => category.category_id);

        // Thêm các danh mục mới (nếu chưa tồn tại)
        const categoriesToAdd = category_ids.filter(category_id => !existingCategoryIds.includes(category_id));
        if (categoriesToAdd.length > 0) {
            const categoriesToAddObjects = categoriesToAdd.map(category_id => ({
                sale_events_id: id,
                category_id
            }));
            await SaleEventsOnCategories.bulkCreate(categoriesToAddObjects);
        }

        // Xóa các danh mục không còn được chọn
        const categoriesToRemove = existingCategoryIds.filter(category_id => !category_ids.includes(category_id));
        if (categoriesToRemove.length > 0) {
            await SaleEventsOnCategories.destroy({
                where: {
                    sale_events_id: id,
                    category_id: categoriesToRemove
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cài đặt danh mục cho sự kiện thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cài đặt danh mục cho sự kiện',
            error: error.message,
        });
    }
};

const getAllCategoryIdsForEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy',
            });
        }

        // Lấy danh sách các mã danh mục sản phẩm của sự kiện
        const categories = await SaleEventsOnCategories.findAll({
            where: { sale_events_id: id },
            attributes: ["category_id"],
        });

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không có danh mục nào cho sự kiện này',
            });
        }

        const categoryIds = categories.map(category => category.category_id);

        res.status(200).json({
            success: true,
            data: categoryIds,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh mục cho sự kiện',
            error: error.message,
        });
    }
};

const getShopsForEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy',
            });
        }

        const shops = await ShopRegisterEvents.findAll({
            where: { sale_events_id: id },
            include: [
                {
                    model: Shop,
                    attributes: ['shop_id', 'shop_name', 'shop_address'],
                }
            ]
        });

        const shopDetails = shops.map(shop => ({
            shop_id: shop.Shop.shop_id,
            shop_name: shop.Shop.shop_name,
            shop_address: shop.Shop.shop_address,
        }));

        res.status(200).json({
            success: true,
            shops: shopDetails,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin cửa hàng cho sự kiện',
            error: error.message,
        });
    }
};

const getVouchersForEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy',
            });
        }

        const vouchers = await DiscountVoucher.findAll({
            where: { sale_events_id: id },
            attributes: [
                'discount_voucher_id',
                'discount_voucher_code',
                'discount_voucher_name',
                'description',
                'discount_type',
                'min_order_value',
                'discount_value',
                'discount_max_value',
                'quantity',
                'usage',
                'started_at',
                'ended_at',
                'discount_voucher_type_id'
            ],
        });

        if (vouchers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không có voucher nào áp dụng cho sự kiện này',
            });
        }

        res.status(200).json({
            success: true,
            vouchers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin voucher cho sự kiện',
            error: error.message,
        });
    }
};

const getEventById = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy',
            });
        }

        res.status(200).json({
            success: true,
            data: saleEvent,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin sự kiện',
            error: error.message,
        });
    }
};

const updateSaleEvent = async (req, res) => {
    const { id } = req.params;
    const { sale_events_name, thumbnail, started_at, ended_at } = req.body;
  
    try {
      const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });
  
      if (!saleEvent) {
        return res.status(404).json({
          success: false,
          message: 'Sự kiện không tìm thấy',
        });
      }
  
      const newStartDate = new Date(started_at);
      const newEndDate = new Date(ended_at);
      const now = new Date();
  
      // Kiểm tra ngày bắt đầu phải nhỏ hơn ngày kết thúc
      if (newStartDate >= newEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc.',
        });
      }
  
      // Kiểm tra ngày bắt đầu và ngày kết thúc không nằm trong quá khứ
      if (newStartDate < now || newEndDate < now) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu và ngày kết thúc không được nằm trong quá khứ.',
        });
      }
  
      // Kiểm tra khoảng cách giữa ngày bắt đầu và ngày kết thúc
      const diffInDays = (newEndDate - newStartDate) / (1000 * 60 * 60 * 24); // Tính khoảng cách theo ngày
      if (diffInDays > 30) {
        return res.status(400).json({
          success: false,
          message: 'Khoảng thời gian của sự kiện không được vượt quá 30 ngày.',
        });
      }

            // Kiểm tra thời gian bắt đầu phải là 00:00:00
            if (
                newStartDate.getHours() !== 0 ||
                newStartDate.getMinutes() !== 0 ||
                newStartDate.getSeconds() !== 0
              ) {
                return res.status(400).json({
                  success: false,
                  message: "Thời gian bắt đầu phải là 00:00:00.",
                });
              }
          
              // Kiểm tra thời gian kết thúc phải là 23:00:00
              if (
                newEndDate.getHours() !== 23 ||
                newEndDate.getMinutes() !== 59 ||
                newEndDate.getSeconds() !== 59
              ) {
                return res.status(400).json({
                  success: false,
                  message: "Thời gian kết thúc phải là 23:59:59.",
                });
              }

      // Kiểm tra thời gian bắt đầu phải là 00:00:00
    
  
      // Lấy danh sách voucher liên kết với sự kiện
      const vouchers = await DiscountVoucher.findAll({
        where: { sale_events_id: id },
        attributes: ['discount_voucher_id', 'started_at', 'ended_at'],
      });
  
      // Kiểm tra ngày mới so với ngày của các voucher
      for (const voucher of vouchers) {
        const voucherStartDate = new Date(voucher.started_at);
        const voucherEndDate = new Date(voucher.ended_at);
  
        if (newStartDate > voucherStartDate || newEndDate < voucherEndDate) {
          return res.status(400).json({
            success: false,
            message: `Ngày cập nhật không hợp lệ. Voucher ${voucher.discount_voucher_id} có thời gian từ ${voucherStartDate.toISOString()} đến ${voucherEndDate.toISOString()}.`,
          });
        }
      }
  
      // Cập nhật sự kiện
      await saleEvent.update({
        sale_events_name,
        thumbnail: thumbnail || saleEvent.thumbnail,
        started_at: newStartDate,
        ended_at: newEndDate,
      });
  
      res.status(200).json({
        success: true,
        message: 'Cập nhật sự kiện thành công',
        data: saleEvent,
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật sự kiện:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật sự kiện',
        error: error.message,
      });
    }
  };  

const activateEvents = async () => {
    try {
        const now = new Date();
        const [activatedCount] = await SaleEvents.update(
            { is_actived: true },
            {
                where: {
                    started_at: { [Op.lte]: now },
                    ended_at: { [Op.gt]: now },
                    is_actived: false,
                },
            }
        );

        if (activatedCount > 0) {
            const updatedEvents = await SaleEvents.findAll();
            io.emit("eventStatusUpdate", updatedEvents);
        }
    } catch (error) {
        console.error("Error activating events:", error);
    }
};

const deactivateEvents = async () => {
    try {
        const now = new Date();
        const [deactivatedCount] = await SaleEvents.update(
            { is_actived: false },
            {
                where: {
                    ended_at: { [Op.lte]: now },
                    is_actived: true,
                },
            }
        );

        if (deactivatedCount > 0) {
            const updatedEvents = await SaleEvents.findAll();
            io.emit("eventStatusUpdate", updatedEvents);
        }
    } catch (error) {
        console.error("Error deactivating events:", error);
    }
};

const getSuggestSaleEventsForShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const currentDate = new Date();

        const count = await SaleEvents.count({
            where: {
                started_at: { [Op.gte]: currentDate },
            },
        });


        const saleEvents = await SaleEvents.findAll({
            where: {
                started_at: { [Op.gte]: currentDate },
            },
            include: [
                {
                    model: SaleEventsOnCategories,
                    include: [
                        {
                            model: Category,
                        },
                    ]
                },
                {
                    model: DiscountVoucher,
                },

            ],

            order: [['started_at', 'ASC']],
            limit,
            offset,
        });

        if (count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không có sự kiện nào phù hợp',
            });
        }

        res.status(200).json({
            success: true,
            data: saleEvents,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy sự kiện gợi ý',
            error: error.message,
        });
    }
}

const shopRegisterSaleEvent = async (req, res) => {
    const { shop_id, sale_events_id } = req.body;
    if (!shop_id || !sale_events_id) {
        return res.status(400).json({
            success: false,
            message: !shop_id ? 'Thiếu shop_id' : 'Thiếu sale_events_id',
        });
    }
    try {
        const checkExist = await ShopRegisterEvents.findOne({
            where: {
                shop_id,
                sale_events_id,
            }
        });
        if (checkExist) {
            return res.status(400).json({
                success: false,
                message: 'Shop đã đăng ký sự kiện này',
            });
        }

        const sale_event = await SaleEvents.findOne({
            where: {
                sale_events_id,
            }
        });

        if (!sale_event) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tồn tại',
            });
        }

        if(sale_event.is_actived === true) {
            return res.status(400).json({
                success: false,
                message: 'Sự kiện đang diễn ra, không thể đăng ký',
            });
        }

        const register_result = await ShopRegisterEvents.create({
            shop_id,
            sale_events_id,
        });
        res.status(200).json({
            success: true,
            data: register_result,
            message: 'Đăng ký sự kiện thành công',
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đăng ký sự kiện',
            error: error.message,
        });
    }
}

const checkShopRegistedEvent = async (req, res) => {
    const { shop_id, sale_events_id } = req.query;
    if (!shop_id || !sale_events_id) {
        return res.status(400).json({
            success: false,
            message: !shop_id ? 'Thiếu shop_id' : 'Thiếu sale_events_id',
        });
    }
    try {
        const checkExist = await ShopRegisterEvents.findOne({
            where: {
                shop_id,
                sale_events_id,
            }
        });
        if (checkExist) {
            return res.status(200).json({
                success: true,
                message: 'Shop đã đăng ký sự kiện này',
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Shop chưa đăng ký sự kiện này',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra đăng ký sự kiện',
            error: error.message,
        });
    }
}

const getProductsRegistedByCategory = async (req, res) => {
    const { shop_id } = req.query;
    if (!shop_id) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu shop_id',
        });
    }

    const currentDate = new Date();
    try {
        const product = await Product.findAll({
            where: {
                shop_id,
            },
            include: [
                {
                    model: SubCategory,
                    include: [
                        {
                            model: Category,
                            include: [
                                {
                                    model: SaleEventsOnCategories,
                                    include: [
                                        {
                                            model: SaleEvents,
                                            where: {
                                                is_actived: true,
                                                ended_at: { [Op.gt]: currentDate },
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        const filter_product = product.filter(p => p.SubCategory.Category.SaleEventsOnCategories.length > 0);

        if (filter_product.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Shop chưa đăng ký sản phẩm nào',
            });
        }

        res.status(200).json({
            success: true,
            data: filter_product,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra đăng ký sự kiện',
            error: error.message,
        });
    }
};

const unSubscribeSaleEvent = async (req, res) => {
    const { shop_id, sale_events_id } = req.body;
    if (!shop_id || !sale_events_id) {
        return res.status(400).json({
            success: false,
            message: !shop_id ? 'Thiếu shop_id' : 'Thiếu sale_events_id',
        });
    }

    try {
        const checkExist = await ShopRegisterEvents.findOne({
            where: {
                shop_id,
                sale_events_id,
            }
        });
        if (!checkExist) {
            return res.status(404).json({
                success: false,
                message: 'Shop chưa đăng ký sự kiện này',
            });
        }

        const sale_event = await SaleEvents.findOne({
            where: {
                sale_events_id,
            }
        });

        if (!sale_event) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tồn tại',
            });
        }

        if(sale_event.is_actived === true) {
            return res.status(400).json({
                success: false,
                message: 'Sự kiện đang diễn ra, không thể hủy đăng ký',
            });
        }

        await ShopRegisterEvents.destroy({
            where: {
                shop_id,
                sale_events_id,
            }
        });

        res.status(200).json({
            success: true,
            message: 'Hủy đăng ký sự kiện thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đăng ký sự kiện',
            error: error.message,
        });        
    }
}

module.exports = {
    getAllSaleEvents,
    addSaleEvent,
    deleteSaleEvent,
    addCategoriesToEvent,
    getAllCategoryIdsForEvent,
    getShopsForEvent,
    getVouchersForEvent,
    getEventById,
    updateSaleEvent,
    activateEvents,
    deactivateEvents,
    getSuggestSaleEventsForShop,
    shopRegisterSaleEvent,
    checkShopRegistedEvent,
    getProductsRegistedByCategory,
    unSubscribeSaleEvent,
}