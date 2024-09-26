const {
    Role
} = require("../models/Assosiations");


const getAllRole = async (req, res) => {
    try {
        const roles = await Role.findAll();
        res.status(200).json({
            success: true,
            data: roles
        })
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        })
    }
}

module.exports = {
    getAllRole
}