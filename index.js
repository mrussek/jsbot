const rp = require('request-promise')

const getNotifications = (req, res) => {
    const pretty = JSON.stringify(req.body, null, 4)
    console.log(pretty)
    res.send(pretty).end()
}

module.exports = {
    "getNotifications": getNotifications
}