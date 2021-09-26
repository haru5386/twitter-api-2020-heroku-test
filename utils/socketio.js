//server
const socketio = require('socket.io')

const { authenticatedSocket } = require('../middleware/auth') //TODO
const { User, Sequelize } = require('../models')

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
      console.log(userId)
      let user = await User.findByPk(userId, { attributes: ['id', 'name', 'account', 'avatar'] })
      user = user.toJSON()
      console.log(user)
      addUser(user)
      console.log('--------')
      console.log(onlineList)
      io.emit("announce", userId)
    })

    socket.on('chatmessage', (msg) => {
      console.log('msg', msg)
      io.emit('newMessage', msg)
      //TODO 建立message database
    })

    socket.on('disconnect', (msg) => {
      io.emit("announce", ` 離開`)
      console.log(msg)
      console.log(`有人離開：目前人數:', ${clientsCount}`)
    })
  })
}

function addUser(user) {
  let exist = onlineList.some(u => u.id === user.id)
  console.log(exist)
  if (exist) {
    io.emit('onlineList', onlineList)
  } else {
    onlineList.push(user)
    io.emit('onlineList', onlineList)
  }
}

function removeUser(user){
  onlineList.splice(onlineList.indexOf(user),1)
}

module.exports = { socket }