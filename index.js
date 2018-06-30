const rp = require('request-promise')

const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');

const getNotifications = (req, res) => {
    const get = (uri, qs) => {
        console.log(`Hitting: ${uri}`)
        console.log(`Params: ${JSON.stringify(qs)}`)
        return rp.get({
            uri: uri,
            qs: qs,
            json: true,
            headers: {
                "User-Agent": "Request-Promise"
            }
        })
    }

    const agent = new WebhookClient({ request: req, response: res });
    console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(req.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`)
    }

    function fallback(agent) {
        agent.add(`I didn't understand`)
        agent.add(`I'm sorry, can you try again?`)
    }

    // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // below to get this function to be run when a Dialogflow intent is matched
    function getNots(agent) {
      agent.add(`Sorry! I can't handle that yet`)

      console.log("Fulfillment \"get-notifications\" completed")
    }

    function getUserRepos(agent) {
        const userName = `${agent.parameters["given-name"]} ${agent.parameters["last-name"]}`

        console.log(`Looking up user: ${userName}`)

        return get("https://api.github.com/search/users", {
            q: userName
        }).then(users => {
            console.log(JSON.stringify(users))
            return get(users.items[0].repos_url)
        }).then(repos => {
            const repoNames = repos.map(repo => repo.name)

            agent.add(`I found repos by ${userName}: ${repoNames.join(", ")}`)

            console.log("Fulfillment \"get-user-repos\" completed")
        })
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome)
    intentMap.set('Default Fallback Intent', fallback)
    intentMap.set('get-notifications', getNots)
    intentMap.set('get-user-repos', getUserRepos)

    agent.handleRequest(intentMap);
}

module.exports = {
    "getNotifications": getNotifications
}