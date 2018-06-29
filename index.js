const rp = require('request-promise')

const getNotifications = (req, res) => {
    const dialog = req.body
    console.log(JSON.stringify(dialog))

    const intent = dialog.queryResult.intent.displayName
    console.log(`intent: ${intent}`)

    switch (intent) {
        case "get-notifications":
        res.json({
            fulfillmentText: "Your notifications are not available"
        }).status(200).end()
        case "get-user-repos":
        res.json({
            fulfillmentText: "Getting user repos"
        }).status(200).end()

        default:
        res.json({
            fulfillmentText: "Lol what happened"
        }).status(200).end()
    }
}

module.exports = {
    "getNotifications": getNotifications
}