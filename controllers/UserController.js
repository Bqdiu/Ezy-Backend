const {
    UserAccount,
    Role
} = require("../models/Assosiations");

const getAllUser = async (req, res) =>{
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

const checkUserExists = async(req, res) => {
    const { user_id} = req.params;
    try {
        const user = await UserAccount.findById(user_id);
        if(user){
            res.status(200).json({message: 'User exists', user});
        }else{
            res.status(404).json({message: 'User not found', user});
        }
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        })
    }
}

module.exports = {
    getAllUser,
    checkUserExists
}