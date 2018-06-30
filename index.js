const rp = require('request-promise')

const { WebhookClient } = require('dialogflow-fulfillment');

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

    function handlePullRequestEvent(event) {
        console.log(`Pull Request Event: ${JSON.stringify(event.payload)}`)
        const number = event.payload.number
        const action = event.payload.action
        const title = event.payload.pull_request.title
        return `Pull request ${number}, ${title}, was ${action}`
    }

    function handlePullRequestReviewEvent(event) {
        console.log(`Pull Request Review Event: ${JSON.stringify(event.payload)}`)
        const reviewer = event.payload.review.user.login
        const action = event.payload.review.state
        const body = event.payload.review.body
        const number = event.pull_request.number
        const title = event.payload.pull_request.title
        return `${reviewer} ${action} on Pull Request ${number}, ${title}, saying "${body}"`
    }

    function handlePullRequestReviewCommentEvent(event) {
        console.log(`Pull Request Review Comment Event: ${JSON.stringify(event.payload)}`)
        const payload = event.payload;
        const commenter = payload.comment.user.login
        const comment = payload.comment.body
        const number = payload.pull_request.number
        const title = payload.pull_request.title

        if (event.payload.action == "created") {
            return `${commenter} commented "${comment}" on Pull Request Number ${number}, ${title}`
        } else {
            return null;
        }
    }

    function handleRepositoryEvent(event) {
        console.log(`Repository Event: ${JSON.stringify(event.payload)}`)
        const payload = event.payload
        const repository = payload.repository.name
        const action = payload.action
        const actor = payload.sender.login

        return `${repository} was ${action} by ${actor}`
    }

    function handlePushEvent(event) {
        console.log(`Push Event: ${JSON.stringify(event.payload)}`)
        const payload = event.payload
        const branch = payload.ref
        const numberOfCommits = payload.size
        let pusher;
        if (payload.pusher) {
            pusher = payload.pusher.name
        } else {
            pusher = "Someone"
        }

        return `${pusher} pushed ${numberOfCommits} to ${branch}`
    }

    function handleReleaseEvent(event) {
        console.log(`Release Event: ${JSON.stringify(event.payload)}`)
        const payload = event.payload
        const author = payload.release.author.login
        const releaseName = payload.release.tagname

        return `${author} published version ${releaseName}`
    }

    function handleForkEvent(event) {
        console.log(`Fork Event: ${JSON.stringify(event.payload)}`)
        const forker = event.payload.forkee.owner.login
        const forked = event.payload.forkee.name
        return `${forked} was forked by ${forker}`
    }

    function getRepoEvents(agent) {
        const repoName = agent.parameters['repository']
        console.log(`Repo name: ${repoName}`)
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
            console.log(`Repo: ${JSON.stringify(repo)}`)

            return get(repo.events_url).then(events => {

                const filteredEvents = events.filter(event => interestingEvents.includes(event.type))
                const topEvents = filteredEvents.slice(0, 5)

                console.log(`Top events: ${JSON.stringify(topEvents)}`)

                const responses = topEvents.map(event => {
                    console.log(`Event type: ${event.type}`)

                    switch (event.type) {
                        case "PullRequestEvent": return handlePullRequestEvent(event);
                        case "PullRequestReviewEvent": return handlePullRequestReviewEvent(event);
                        case "PullRequesetReviewCommentEvent": return handlePullRequestReviewCommentEvent(event);
                        case "RepositoryEvent": return handleRepositoryEvent(event);
                        case "PushEvent": return handlePushEvent(event);
                        case "ReleaseEvent": return handleReleaseEvent(event);
                        case "ForkEvent": return handleForkEvent(event);
                        default: break;
                    }

                    return null
                }).filter(event => event != null)

                console.log(`Responses: ${responses}`)

                agent.add(responses.join(", "))
            })
        })
    }

    function getRepoIssues(agent) {
        const numberRegex = /\{.*\}/

        return resolveRepo(agent.parameters['repository'])
            .then(repo => {
                const allIssues = repo.issues_url.replace(numberRegex, "")
                return get(allIssues)
            }).then(issues => {
                const issueDescriptions = issues.map(issue => `Issue number ${issue.number}, ${issue.title}, opened by ${issue.user.login}`)

                agent.add(issueDescriptions.join(", "))
            })
    }

    function getPullRequests(agent) {
        const numberRegex = /\{.*\}/

        return resolveRepo(agent.parameters['repository']).then(repo => {
            const allPulls = repo.pulls_url.replace(numberRegex, "")
            return get(allPulls)
        }).then(pulls => {
            const pullDescriptions = pulls
                .filter(pull => pull.state == "open")
                .map(pull => `Pull request number ${pull.number}, ${pull.title}, opened by ${pull.user.login}`)

            agent.add(pullDescriptions.join(", "))
        })
    }

    const intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome)
    intentMap.set('Default Fallback Intent', fallback)
    intentMap.set('get-notifications', getNots)
    intentMap.set('get-user-repos', getUserRepos)
    intentMap.set('get-repo-description', getRepoDescription)
    intentMap.set('get-repo-events', getRepoEvents)
    intentMap.set('get-repo-issues', getRepoIssues)
    intentMap.set('get-repo-pulls', getPullRequests)

    agent.handleRequest(intentMap);
}

module.exports = {
    "getNotifications": getNotifications
}