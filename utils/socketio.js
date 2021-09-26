// announce 統一設定為廣播在Msg
// 需要個別統計公開人數?

const { authenticatedSocket } = require('../middleware/auth')
const { User, Sequelize } = require('../models')
const socketio = require('socket.io')
const { postChat} = require('../controllers/chatroomController')


let io
let onlineList = []

const socket = server => {
  // Set up socket.io
  io = socketio(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:8080',
      ],
      methods: ['GET', 'POST'],
      transports: ['websocket', 'polling'],
      credentials: true
    },
    allowEIO3: true
  })
  console.log('Socket.io init success')

  if (!io) throw new Error('No socket io server instance')

  io/*.use(authenticatedSocket)*/.on('connection', socket => {

    console.log(socket.user)


    console.log('===== connected!!! =====')

    const { clientsCount } = io.engine

    console.log('有人加入公開聊天室，目前人數:', clientsCount)

    socket.on('joinPublic', async (userId) => {
      console.log('userId', userId)
      let user = await User.findByPk(userId, { attributes: ['id', 'name', 'account', 'avatar'] })
      user = user.toJSON()
      console.log('user',user)
      addUser(user)
      console.log('--------')
      console.log(onlineList)
      console.log('---clientsCount in ---')
      console.log(clientsCount)
      io.emit("announce", user)
    })

    socket.on('chatmessage', async (data) => {
      const userId = data.UserId
      let user = await User.findByPk(userId, { attributes: ['id', 'name', 'account', 'avatar'] })
      user = user.toJSON()
      io.emit('newMessage', { user: user, msg: data.msg, date: new Date() })
      postChat(user, data.msg)
    })

    socket.on('leavePublic', async(userId) => {
      console.log(userId)
      console.log('onlineList', onlineList)
      let userIndex = onlineList.findIndex(x => x.id === Number(userId))

      if(userIndex !== -1){
        
        getRemoveUser(userIndex)
      }

      console.log('-------刪除後onlineList------')
      console.log(onlineList)
      console.log('---clientsCount out ---')
      console.log(clientsCount)
      io.emit("onlineList",　onlineList)

    })
  })
}

function addUser(user) {
  let exist = onlineList.some(u => u.id === user.id)
  //console.log(exist)
  if (exist) {
    io.emit('onlineList', onlineList)
  } else {
    onlineList.push(user)
    io.emit('onlineList', onlineList)
  }
}

// GET removeUserName, 更新onlineList
function getRemoveUser(userIndex){
  const userName = onlineList[userIndex].name
  console.log(userName,'離開')
  io.emit("announce",　` ${userName} 離開`)
  onlineList.splice(userIndex,1)
  console.log(onlineList)
  }



module.exports = { socket }