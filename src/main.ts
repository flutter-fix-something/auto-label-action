import {setFailed, getInput, info} from '@actions/core'
import {context} from '@actions/github'
import {Octokit} from '@octokit/rest'

function log(title: string, message: unknown): void {
  info(`${title}: ${message}`)
}

function getOctokit(): Octokit {
  // Get the GitHub token from the environment
  const token = getInput('github-token')
  if (!token) {
    throw new Error('No token found, please set github-token input.')
  }
  const octokit = new Octokit({auth: `token ${token}`})

  return octokit
}

async function run(): Promise<void> {
  const token = getInput('github-token', {required: true})
  info(`Get github token: ${token}`)
  try {
    if (context.payload.pull_request) {
      await handlePullRequest()
    } else if (context.payload.issue) {
      await handleIssue()
    } else {
      setFailed('Could not get issue or pull request from context.')
    }
  } catch (e) {
    log('Happen error', `${e}`)
    setFailed(`action happen error: ${e}`)
  }
}

function randomColor(): string {
  let color = '#'
  const letters = '0123456789ABCDEF'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

async function setIssueLabel(
  issueNumber: number,
  label: string
): Promise<void> {
  const kit = getOctokit()

  const owner = context.repo.owner
  const repo = context.repo.repo

  // check label is exist
  const {data: labels} = await kit.rest.issues.listLabelsOnIssue({
    issue_number: issueNumber,
    owner,
    repo
  })

  const isExist = labels.some(item => item.name === label)

  if (isExist) {
    info(`Label is exist, Label ${label} is exist, skip`)
    return
  }

  log('current issue labels', `${labels}`)

  // check repo has the label
  const {data: repoLabels} = await kit.rest.issues.listLabelsForRepo({
    per_page: 100,
    owner,
    repo
  })

  log('current repo labels', `${repoLabels}`)

  const isRepoExist = repoLabels.some(item => item.name === label)

  if (!isRepoExist) {
    log('Not found label', `Not found label ${label} in repo, create it`)

    // create label for repo
    await kit.rest.issues.createLabel({
      name: label,
      color: randomColor(),
      owner,
      repo
    })
  }

  log('Add label', `Add label ${label} to issue`)
  // add label to issue
  await kit.rest.issues.addLabels({
    issue_number: issueNumber,
    labels: [label],
    owner,
    repo
  })

  log('Add label', `Add label ${label} to issue success`)
}

async function handleIssue(): Promise<void> {
  // Get the issue number from the context
  const issueNumber = context.payload.issue?.number

  // Get the issue title from the context
  const issueTitle = context.payload.issue?.title

  if (!issueNumber || !issueTitle) {
    setFailed('Could not get issue number or title from context')
    return
  }

  // Check issue title is string
  if (typeof issueTitle !== 'string') {
    log('Not found title', 'The issue title is not string, skip')
    return
  }

  // handle issue title
  const regex = /(\[.*\])\s(.*)/
  const match = issueTitle.match(regex)

  if (!match) {
    log('Not found title', 'Not fount issue title prefix, skip')
    return
  }

  const prefix = match[1]

  const labelPrefix = prefix.toLowerCase()
  // Found ignore case prefix 'bug'
  if (labelPrefix.includes('bug')) {
    setIssueLabel(issueNumber, 'Type: Bug')
  } else if (labelPrefix.includes('feature') || labelPrefix.includes('feat')) {
    setIssueLabel(issueNumber, 'Type: Feature')
  } else if (labelPrefix.includes('question') || labelPrefix.includes('help')) {
    setIssueLabel(issueNumber, 'Type: Question')
  } else {
    log('Not fount title', 'Not fount issue title prefix, skip')
  }
}

async function handlePullRequest(): Promise<void> {
  // Get pull request number from the context
  const pullRequestNumber = context.payload.pull_request?.number
  if (!pullRequestNumber) {
    throw new Error('Could not get pull request number from context')
  }

  // Get pull request title from the context
  const pullRequestTitle = context.payload.pull_request?.title
  if (!pullRequestTitle) {
    throw new Error('Could not get pull request title from context')
  }

  const regex = /(\[.*\])\s(.*)/
  const match = pullRequestTitle.match(regex)

  if (!match) {
    log('Not found title', 'Not fount pull request title prefix, skip')
    return
  }

  const prefix = match[1]

  const labelPrefix = prefix.toLowerCase()

  if (typeof labelPrefix !== 'string') {
    log('Not found title', 'The pull request title is not string, skip')
    return
  }

  // Found ignore case prefix 'bug'

  if (labelPrefix.includes('bug')) {
    setIssueLabel(pullRequestNumber, 'Type: Bug')
  } else if (labelPrefix.includes('feature') || labelPrefix.includes('feat')) {
    setIssueLabel(pullRequestNumber, 'Type: Feature')
  } else {
    log('Not fount title', 'Not fount pull request title prefix, skip')
  }
}

run()
