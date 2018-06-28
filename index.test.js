const express = require('express')
const index = require('./index')

const app = express()
app.use(express.json())

app.post('/myfunc', index.getNotifications)
console.log("running")

app.listen(3000, () => console.log('Listening on 3000'))