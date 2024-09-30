const {
    BusinessStyle
} = require("../models/Assosiations");


const getAllBusinessStyle = async (req, res) => {
    try {
        const businessStyle = await BusinessStyle.findAll();
        res.status(200).json({
            success: true,
            data: businessStyle
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        })        
    }
}

module.exports = {
    getAllBusinessStyle,
    
}