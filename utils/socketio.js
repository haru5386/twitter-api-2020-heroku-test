// announce 統一設定為廣播在Msg
// 需要個別統計公開人數?

const socketio = require('socket.io')
const { authenticatedSocket } = require('../middleware/auth')

let io
let userList = []

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

    console.log('===== connected!!! =====')

    const { clientsCount } = io.engine

    console.log('有人加入公開聊天室，目前人數:', clientsCount)

    socket.on('joinPublic', (msg) => {
      console.log(msg)
      io.emit("announce", msg)

    })

    socket.on('chatmessage', (msg) => {
      console.log('msg', msg)
      io.emit('newMessage', msg)
      //TODO 建立message database
    })


    socket.on('leavePublic', () => {
      //1.確定離開使用者id(前端傳) -> 假定userId 111(num)
      const userId = 1
      //2.抓userList離開人的name 建立通道announce，XXX離開
      const userIndex = onlineList.findIndex(x => x.id === userId)
      const userName = onlineList[userIndex].name
      console.log(userName,'離開')
      io.emit("announce",　` ${userName} 離開`)
      socket.leave(socket['joinPublic'])

      //3.在userList刪去該用戶obj
      onlineList.splice(userIndex,1)
      console.log(onlineList)
      io.emit("onlineList",　onlineList)

    })

/*     socket.on('disconnect', (msg) => {
      io.emit("announce", ` ${clientsCount} 離開`)
      console.log(msg)
      console.log(`有人離開：目前人數:', ${clientsCount}`)
    }) */

  })
}

module.exports = { socket }