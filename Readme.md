# Multi prompt

Divide questions/prompts into multiple sections, where the answers to each section is fed into the next in a chain.

You can furthermore feed *multi prompt* with a set of known answers, and the user will not be prompted to answer those questions.

## Usage

```js
import * as inquirer from 'inquirer'

import {
  multiPrompt
} from '../src'

async function secondPrompt(answers: any, opts: any) {
  return [{
    type: 'input',
    name: 'type',
    default: 'tiger',
    choices: ['bird', 'tiger'],
    message: `At ${answers.age} years old you should be a`
  }]
}

async function firstPrompt(answers: any, opts: any) {
  // first: answers
  return [{
    type: 'input',
    name: 'firstName',
    message: 'First name', // should be humanize of name by default
    when(answers) {
      return answers.length == 0
    }
  }]
}

const prompts = {
  sections: {
    first: {
      // add whatever metadata
      name: 'first',
      label: 'My first section',
      // prompt is required
      prompt: firstPrompt
    },
    second: {
      name: 'second',
      prompt: secondPrompt
    }
  },
  flow: [
    'first',
    'second'
  ]
}

const options = {
  logOn: true, // enable detailed logging
  prompt: inquirer.prompt
  on: {
    sectionNew(section, options) {
      const { name } = section
      // write nice header for section
      chalk.cyan(`:: ${name} ::`)
    },
    sectionAnswers(section, answers, options) {
      const { name } = section
      const answered = Object.keys(answers).join(',')
      options.log(name, answers)

      // sum up what answers have been asked (or provided) when section is done
      chalk.green(`section ${name} received answers for ${answered}`)
    }
  }
}

const knownAnswers = {
  firstName: 'Kristian'
}

const answers = await multiPrompt(prompts, options)
```

## Options

### knownAnswers

Object containing a map of answer names and answer provided. Can be used to filter prompts asked to the user

### on

`on` is an object that may contain any of the following callback functions

- `sectionNew(section)`
- `sectionCreated(section, promptsToAsk)`
- `sectionAnswers(section, answers)`
- `promptedAnswers(answersPrompted)`

### defaults

Advanced overrides for full control

- `prompt` function to prompt user
- `promptDefToArray(promptDef, options)` normalize to array of prompt definitions
- `promptNames(promptDefList, options)` names of prompts (ie. keys to be used in `answers` object)
- `getPromptsToAsk((promptDefList, { include, exclude}, options)` filter prompt list by names of known answers or whatever include/exclude is suitable
- `async createPromptsToAsk({section, accAnswers, knownAnswerNames, options, defaults })` create prompts to be asked
- `createLog(options)` create logging function

The following is the full set of `defaults` you can override:

```js
{
  createLog(options),
  log: console.log,
  error(msg, data),
  prompt: inquirer.prompt,
  promptNames(promptDefList, options),
  promptDefToArray(promptDef),
  getPromptsToAsk(promptDefList, { include, exclude} , options),
  async createPromptsToAsk({
    section,
    accAnswers,
    knownAnswerNames,
    options,
    defaults
  }),
  on // see above
}
```

### Prompting options

This library is not limited to be used for text/CLI based prompting but is general purpose.
You could integrate prompting using Voice control, use a chatbot API such as Alexa or whatever you like ;)

### Fake prompts

In the test suite we use the following `fakePrompt` function.

```js
function fakePrompt(promptDefList: any, options: any) {
  options.log('fakePrompt', {
    promptDefList
  })
  return promptDefList.reduce((acc: any, promptDef: any) => {
    return Object.assign(acc, {
      [promptDef.name]: promptDef.default || 'unknown'
    })
  }, {})
}
```

