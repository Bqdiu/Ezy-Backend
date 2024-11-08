const {
    Role,
    UserAccount,
} = require("../models/Assosiations");
const { Op } = require('sequelize');

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

const addRole = async (req, res) => {
    const { role_name } = req.body;

    try {
        const existingRole = await Role.findOne({ where: { role_name } });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Tên role đã tồn tại, vui lòng chọn tên khác!',
            });
        }

        const newRole = await Role.create({ role_name });
        res.status(201).json({
            success: true,
            data: newRole,
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
};


const deleteRole = async (req, res) => {
    const { id } = req.params;

    try {
        const roleWithUsers = await Role.findOne({
            where: { role_id: id },
            include: {
                model: UserAccount,
                as: "UserAccounts",
            },
        });

        if (roleWithUsers && roleWithUsers.UserAccounts && roleWithUsers.UserAccounts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Role không thể xóa vì đang được sử dụng!',
            });
        }

        const deletedRole = await Role.destroy({
            where: { role_id: id },
        });

        if (deletedRole) {
            return res.status(200).json({
                success: true,
                message: 'Role đã được xóa thành công!',
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Role không tồn tại!',
            });
        }
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
};

const updateRole = async (req, res) => {
    const { id } = req.params;
    const { role_name } = req.body;

    try {
        console.log(`Updating role with ID: ${id} and name: ${role_name}`);

        const role = await Role.findOne({ where: { role_id: id } });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role không tồn tại!',
            });
        }

        const existingRole = await Role.findOne({ where: { role_name, role_id: { [Op.ne]: id } } });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Tên role đã tồn tại, vui lòng chọn tên khác!',
            });
        }

        role.role_name = role_name;
        await role.save();

        return res.status(200).json({
            success: true,
            message: 'Role đã được cập nhật thành công!',
            data: role,
        });
    } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
};

module.exports = {
    getAllRole,
    addRole,
    deleteRole,
    updateRole,
}