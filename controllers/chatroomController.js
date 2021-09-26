const { Chat, Sequelize, User } = require('../models')
const { Op } = Sequelize

let chatroomController = {
  publicChat: async (req, res, next) => {
    res.send('respond with a resource.')
  },
  postChat: async (user, msg) => {
    try {
      return await Chat.create({
        UserId: user.id,
        text: msg
      })
    } catch (err) { console.log(err) }
  },
  getHistoryMsg: async (req, res, next) => {
    try {
      const chat = await Chat.findAll({
        attributes: [
          ['id', 'ChatId'], 'createdAt', 'text'
        ],
        include: [
          {
            model: User, attributes: ['id', 'name', 'avatar', 'account'],
            where: { role: { [Op.not]: 'admin' } }
          }],
        order: [['createdAt', 'ASC']],
        raw: true,
        nest: true
      })
      return res.status(200).json(chat)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = chatroomController