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

    function resolveUser(name) {
        return get('https://api.github.com/search/users', {
            q: name
        }).then(users => users.items[0])
    }

    function resolveRepo(repo) {
        return get('https://api.github.com/search/repositories', {
            q: repo
        }).then(repos => repos.items[0])
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

        return resolveUser(userName).then(user => {
            console.log(JSON.stringify(user))
            return get(user.repos_url)
        }).then(repos => {
            const repoNames = repos.map(repo => repo.name)

            agent.add(`I found repos by ${userName}: ${repoNames.join(", ")}`)

            console.log("Fulfillment \"get-user-repos\" completed")
        })
    }

    function getRepoDescription(agent) {
        const repoName = agent.parameters['repository']
        return resolveRepo(repoName).then(repo => agent.add(`${repoName} is a ${repo.description}`))
    }

    function handlePullRequestEvent(agent, event) {
        const number = event.payload.number
        const action = event.payload.action
        const title = event.payload.pull_request.title
        agent.add(`Number ${number}, ${title}, was ${action}`)
    }

    function handleForkEvent(agent, event) {
        const forker = event.payload.forkee.owner
        const forked = event.payload.name
        agent.add(`${forked} was forked by ${forker}`)
    }

    function getRepoEvents(agent) {
        const repoName = agent.parameters['repository']
        const interestingEvents = [
            "PullRequestEvent", 
            "PullRequestReviewEvent", 
            "PullRequestReviewCommentEvent", 
            "RepositoryEvent", 
            "PushEvent", 
            "ReleaseEvent", 
            "ForkEvent"
        ]

        return resolveRepo(repoName).then(repo => {
            get(repo.events_url).then(events => {
                const filteredEvents = events.filter(event => interestingEvents.includes(event.type))
                const topEvents = filteredEvents.slice(0, 5)

                topEvents.forEach(event => {
                    switch (event.type) {
                        case "PullRequestEvent": handlePullRequestEvent(agent, event); break;
                        case "PullRequestReviewEvent": break;
                        case "PullRequesetReviewCommentEvent": break;
                        case "RepositoryEvent": break;
                        case "PushEvent": break;
                        case "ReleaseEvent": break;
                        case "ForkEvent": handleForkEvent(agent, event); break;
                        default: break;
                    }
                })
            })
        })
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome)
    intentMap.set('Default Fallback Intent', fallback)
    intentMap.set('get-notifications', getNots)
    intentMap.set('get-user-repos', getUserRepos)
    intentMap.set('get-repo-description', getRepoDescription)
    intentMap.set('get-repo-events', getRepoEvents)

    agent.handleRequest(intentMap);
}

module.exports = {
    "getNotifications": getNotifications
}