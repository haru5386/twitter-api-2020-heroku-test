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
    //先隨便設定username
    console.log('===== connected!!! =====')
    //計算目前使用io的人
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
      clientsCount -= 1
      console.log("A user leaved.")
      io.emit("announce", {
        message: 'user 離線'
      })
    })
    socket.on('disconnect', (msg) => {
      io.emit("announce", ` 離開`)
      console.log(msg)
      console.log(`有人離開：目前人數:', ${clientsCount}`)
    })
    socket.on('bye',(msg)=>{
      console.log(msg)
    })
  })
}

module.exports = { socket }