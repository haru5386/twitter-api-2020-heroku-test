const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')

const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID

const { User, Tweet, Like, Sequelize, Reply } = require('../models')

const uploadImg = path => {
  return new Promise((resolve, reject) => {
    imgur.upload(path, (err, img) => {
      if (err) {
        return reject(err)
      }
      resolve(img)
    })
  })
}

let userController = {
  userLogin: (req, res) => {
    const { email, password } = req.body

    // 檢查必要資料
    if (!email.trim() || !password.trim()) {
      return res.json({ status: 'error', message: "required fields didn't exist" })
    }

    // 檢查 user 是否存在與密碼是否正確
    User.findOne({ where: { email } }).then(user => {
      if (!user) return res.status(401).json({ status: 'error', message: 'no such user found' })
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ status: 'error', message: 'passwords did not match' })
      }
      if (user.role === 'admin') return res.status(401).json({ status: 'error', message: 'no such user found(admin)' })
      console.log(user.toJSON())
      // 簽發 token
      const payload = { id: user.id }
      const token = jwt.sign(payload, process.env.JWT_SECRET)
      return res.status(200).json({
        status: 'success',
        message: 'login successfully',
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin
        }
      })
    })
  },
  register: (req, res) => {
    //TODO 使用者註冊，account、email必須唯一
    const { account, email, password, checkPassword } = req.body
    // 檢查必要資料
    if (!account.trim() || !email.trim() || !password.trim() || !checkPassword.trim()) {
      return res.status(422).json({ status: 'error', message: "欄位不可空白" }) //case1
    }
    if (password !== checkPassword) return res.status(401).json({ status: 'error', message: "兩次密碼輸入不同！" }) //case2
    Promise.all([User.findOne({ where: { email } }), User.findOne({ where: { account } })])
      .then(([userHasEmail, userHasAccount]) => {
        if (userHasEmail && userHasAccount) return res.status(409).json({ status: 'error', message: "email 和 account 已重覆註冊！" }) //TODO 問前端case5
        if (userHasEmail) return res.status(409).json({ status: 'error', message: "email 已重覆註冊！" }) //case3
        if (userHasAccount) return res.status(409).json({ status: 'error', message: "account 已重覆註冊！" }) //case4
        User.create({
          account,
          email,
          password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null),
          role: 'user',
          avatar: 'https://i.imgur.com/PxViWBK.png',
          cover: 'https://images.unsplash.com/photo-1575905283836-a741eb65a192?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1377&q=80'
        })
          .then(user => {
            return res.json({ status: 'success', message: '成功註冊帳號！' })
          })
      })
      .catch(err => { console.log(err) })
  },
  getUser: (req, res, next) => {
    User.findByPk(req.params.id, {
      attributes: [
        'id', 'name', 'avatar', 'introduction', 'account', 'cover', 'role',
        [Sequelize.literal('COUNT(DISTINCT Tweets.id)'), 'tweetsCount'],
        [Sequelize.literal('COUNT(DISTINCT Followers.id)'), 'followersCount'],
        [Sequelize.literal('COUNT(DISTINCT Followings.id)'), 'followingsCount']
      ],
      include: [
        Tweet,
        { model: User, as: 'Followers', attributes: [] },
        { model: User, as: 'Followings', attributes: [] },
        { model: Like, attributes: [] },
      ]
    })
      .then((user) => {
        //不可看到admin資料 或是空用戶
        if (user.role === 'admin' || !user) {
          return res.status(403).json({
            'status': 'error',
            'message': '此用戶不存在'
          })
        }
        return res.status(200).json(user)
      })
      .catch(err => { next(err) })
  },
  getUserTweets: (req, res, next) => {
    Promise.all([
      User.findByPk(req.params.id, {
        attributes: [
          'role',
        ]
      }),
      Tweet.findAll({
        where: { UserId: req.params.id },
        include: [
          { model: Reply },
          { model: Like },
          { model: User, attributes: ['id', 'name', 'avatar', 'account'] },
        ]
      })
    ])
      .then(([user, tweets]) => {
        //不可看到admin資料 或是空用戶
        if (!user || user.role === 'admin') {
          return res.status(403).json({
            'status': 'error',
            'message': '此用戶不存在'
          })
        }
        let tweetSet = tweets.map(tweet => ({
          'id': tweet.id,
          'description': tweet.description,
          'updatedAt': tweet.updatedAt,
          'replyCount': tweet.Replies.length,
          'likeCount': tweet.Likes.length,
          'user': tweet.User
        }))
        return res.status(200).json(tweetSet)
      })
      .catch(err => { next(err) })
  },
  putUser: async (req, res) => {
    //前台：修改使用者個人資料(avatar、cover、name、introduction)
    const { name, introduction } = req.body
    //上傳至imgur

    const { files } = req
    //1.確定是登入者
    if (Number(req.params.id) !== req.user.id) {
      return res.status(403).json({ status: 'error', message: "並非該用戶，無訪問權限！" })
    }
    // 確定introduction(160)、name(50)
    if (name && name.length > 50) {
      return res.status(422).json({ status: 'error', message: "名稱字數超出上限！" })
    }
    if (introduction && introduction.length > 160) {
      return res.status(422).json({ status: 'error', message: "自我介紹字數超出上限！" })
    }
    let images = {}
    if (files) {
      imgur.setClientID(IMGUR_CLIENT_ID)
      for (const key in files) {
        images[key] = await uploadImg(files[key][0].path)
      }
    }
    let user = await User.findByPk(req.params.id)
    await user.update({
      name,
      introduction,
      avatar: images.avatar ? images.avatar.data.link : user.avatar,
      cover: images.cover ? images.cover.data.link : user.cover
    })
    return res.status(200).json({
      status: 'success',
      message: 'Update successfully'
    })

  },
  putUserSetting: (req, res) => {
    //修改使用者設定(修改使用者設定(account、name、email、password)，account、email必須唯一
    const { account, email, password, checkPassword } = req.body

    //1.確定是登入者
    if (req.user.id !== Number(req.params.id)) {
      return res.status(403).json({ status: 'error', message: "並非該用戶，無訪問權限！" })
    }

    // 檢查必要資料
    if (!account.trim() || !email.trim() || !password.trim() || !checkPassword.trim()) {
      return res.status(422).json({ status: 'error', message: "欄位不可空白" }) //case1
    }

    if (password !== checkPassword) return res.status(401).json({ status: 'error', message: "兩次密碼輸入不同！" }) //case2
    Promise.all([User.findOne({ where: { email } }), User.findOne({ where: { account } })])
      .then(([userHasEmail, userHasAccount]) => {
        if (userHasEmail && userHasAccount) return res.status(409).json({ status: 'error', message: "email 和 account 已有註冊！" })
        if (userHasEmail) return res.status(409).json({ status: 'error', message: "email 已有註冊，請重新輸入！" }) //case3
        if (userHasAccount) return res.status(409).json({ status: 'error', message: "account 已有註冊，請重新輸入！" }) //case4
        User.findByPk(req.params.id)
          .then((user) => {
            user.update({
              account,
              email,
              password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null),
            })
          })
          .then(user => {
            return res.json({ status: 'success', message: '已成功修正！' })
          })
      })
      .catch(err => { console.log(err) })
  },
  getTweets: (req, res, next) => {
    User.findByPk(req.user.id, {
      include: [
        { model: User, as: 'Followers', attributes: ['id'] },
      ]
    })
      .then((user) => {
        let followers = user.Followers.map(user => { return user.id }) //array去裝followers
        Tweet.findAll({
          where: { UserId: followers }
        })
          .then((tweet) => {
            return res.json({ tweet })
          }).catch(err => { next(err) })
      })

  },
  getTopUsers: async (req, res, next) => {
    try {
      const user = await User.findAll({
        include: [{ model: User, as: 'Followers' }],
        attributes: [
          'id', 'name', 'avatar', 'account',
          [Sequelize.literal('(SELECT COUNT(*) FROM Followships WHERE Followships.followingId = User.id)'), 'followersCount'
          ]
        ],
        order: [[Sequelize.literal('followersCount'), 'DESC']],
        limit: 10,
        raw: true,
        nest: true
      })
      return res.status(200).json(user)
    } catch (err) {
      next(err)
    }
  },
  getFollowers: async (req, res, next) => {
    try {
      const { id } = req.params
      let user = await User.findByPk(id, {
        include: [{ model: User, as: 'Followers' }],
        order: [[Sequelize.literal('`Followers->Followship`.`createdAt`'), 'DESC']]
      })

      if (!user) {
        return res.status(422).json({
          status: 'error',
          message: 'Can not find this user'
        })
      }
      Followers = user.Followers.map(i => ({
        followerId: i.id,
        name: i.name,
        avatar: i.avatar,
        account: i.account
      }))
      return res.status(200).json(Followers)
    } catch (err) {
      next(err)
      console.log(err)
    }
  },
  getFollowings: async (req, res, next) => {
    try {
      const { id } = req.params
      let user = await User.findByPk(id, {
        include: [{ model: User, as: 'Followings' }],
        order: [[Sequelize.literal('`Followings->Followship`.`createdAt`'), 'DESC']]
      })

      if (!user) {
        return res.status(422).json({
          status: 'error',
          message: 'Can not find this user'
        })
      }

      Followings = user.Followings.map(i => ({
        followingId: i.id,
        name: i.name,
        avatar: i.avatar,
        account: i.account
      }))
      return res.status(200).json(Followings)
    } catch (err) {
      next(err)
    }
  },
  getLikedTweets: async (req, res, next) => {
    try {
      const { id } = req.params
      let user = await User.findByPk(id, {
        include: [{ model: Like, include: [{ model: Tweet }] }],
        order: [[Sequelize.literal('createdAt'), 'DESC']]
      })

      if (!user) {
        return res.status(422).json({
          status: 'error',
          message: 'Can not find this user'
        })
      }
      const likeTweets = user.Likes.map(i => ({
        TweetId: i.TweetId,
        UserId: i.UserId,
        Tweet: i.Tweet,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      }))
      return res.status(200).json(likeTweets)
    } catch (err) {
      next(err)
    }
  },
  getUserReliedTweets: (req, res) => {
    const UserId = req.params.id
    Reply.findAll({
      where: {
        UserId
      },
      attributes: [
        'TweetId', 'comment', 'updatedAt', 'createdAt'
      ],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'avatar', 'account']
        },
        {
          model: Tweet,
          attributes: ['description'],
          include: { model: User, attributes: ['id', 'account'] }
        },
      ],
      order: [
        ['createdAt', 'DESC']
      ]
    })
      .then((tweet) => {
        return res.json([...tweet])
      })
  }
}

module.exports = userController