//server
const socketio = require('socket.io')

const { authenticatedSocket } = require('../middleware/auth') //TODO

let io
let userList = []

const socket = server => {
  // Set up socket.io
  io = socketio(server, {
    cors: {
      origin: [
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST'],
      transports: ['websocket', 'polling'],
      credentials: true
    },
    allowEIO3: true
  })
  console.log('Socket.io init success')

  if (!io) throw new Error('No socket io server instance')

  io.use(authenticatedSocket).on('connection', socket => {
    //先隨便設定username
    console.log('===== connected!!! =====')
    //計算目前使用io的人
    const { clientsCount } = io.engine
    console.log('有人加入公開聊天室，目前人數:', clientsCount)
    
    socket.on('joinPublic', () => {
      socket.username = Math.floor(Math.random() * 1000)
      userList.push(socket.username)
      console.log(userList)
      socket.broadcast.emit("announce", {
        message: `User${socket.username} 上線`
      })
    })

    socket.on('chatmessage', (msg) => {
      console.log('msg', msg)

      socket.broadcast.emit('new message', { 
        username: socket.username,
        message: data
      })
      //TODO 建立message database
    })

    socket.on('leavePublic',  () => {
      clientsCount-=1
      console.log("A user leaved.")
      io.emit("announce", {
        message: 'user 離線'
      })
    })


  })
}

module.exports = { socket }