const {
    RequestSupports,
    UserAccount,
} = require("../models/Assosiations");
const sequelize = require("../config/database");

const getSupportRequest = async (req, res) => {
    try {
        const supportRequests = await RequestSupports.findAll({
            include: [
                {
                    model: UserAccount, 
                    attributes: ["full_name"],
                },
            ],
        });

        res.status(200).json({
            success: true,
            data: supportRequests,
        });
    } catch (error) {
        console.error("Error fetching support requests:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch support requests",
        });
    }
};



module.exports = {
    getSupportRequest,
}