const rp = require('request-promise')

const getNotifications = (req, res) => {
    const get = (uri, qs) => {
        console.log(`Hitting: ${uri}`)
        return rp.get({
            uri: uri,
            qs: qs,
            json: true,
            headers: {
                "User-Agent": "Request-Promise"
            }
        })
    }

    const dialog = req.body
    console.log(JSON.stringify(dialog))

    const queryResult = dialog.queryResult
    const intent = queryResult.intent.displayName
    const parameters = queryResult.parameters
    const firstName = parameters["given-name"]
    const lastName = parameters["last-name"]
    console.log(`intent: ${intent}`)


    switch (intent) {
        case "get-notifications":
            res.json({
                fulfillmentText: "Your notifications are not available"
            }).status(200).end()
            break;
        case "get-user-repos":
            console.log("Getting user repos")
            get("https://api.github.com/search/users", {
                q: `${firstName} ${lastName}`
            }).then(jake => {
                console.log(JSON.stringify(jake))
                return get(jake.items[0].repos_url)
            }).then(repos => {
                console.log(JSON.stringify(repos))
                const names = repos.map(repo => repo.name)

                res.json({
                    fulfillmentText: `${firstName} ${lastName}'s repositories are: ${names.join(", ")}`
                }).status(200).end()
            })
        break
        default:
            res.json({
                fulfillmentText: "Lol what happened"
            }).status(200).end()
            break;
    }
}

module.exports = {
    "getNotifications": getNotifications
}