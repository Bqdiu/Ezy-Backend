const {
    UserAccount,
    Role
} = require("../models/Assosiations");

const getAllUser = async (req, res) => {
    try {
        const users = await UserAccount.findAll({
            include: [
                {
                    model: Role
                }
            ]
        });
        res.status(200).json({
            success: true,
            data: users
        })
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        })
    }
}

const checkEmailExists = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: true, message: 'Email is required' });
    }
    try {
        const user = await UserAccount.findOne({ 
            where: {
                email: email
            }
         });
        console.log('User:', user); 
        if (user) {
            return res.status(200).json({
                message: 'User exists',
                user: user,
                email: email
            });
        } else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: error.message || 'An unexpected error occurred',
        });
    }
};

const sellerRegister = async (req, res) => {
    const { user_id, email } = req.body;
    const role_id = 2; // seller role
    try {
        const newUser = await UserAccount.create({ user_id, email, role_id });
        res.status(201).json({
            success: true,
            user: newUser,
            message: 'User created successfully'
        })
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        })
    }
}

module.exports = {
    getAllUser,
    checkEmailExists,
    sellerRegister,
}