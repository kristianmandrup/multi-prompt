import * as inquirer from 'inquirer'

import {
  multiPrompt
} from '../src'

async function secondPrompt(answers: any, options: any) {
  options.log('create secondPrompt', {
    answers,
    // options
  })
  return [{
    type: 'input',
    name: 'type',
    default: 'tiger',
    choices: ['bird', 'tiger'],
    message: `At ${answers.age} year old you should be a`
  }]
}

async function firstPrompt(answers: any, opts: any) {
  // first: answers
  return [{
    type: 'input',
    name: 'firstName',
    default: 'Kristian',
    message: 'First name', // should be humanize of name by default
    when(answers: any) {
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

const knownAnswers = {
  firstName: 'Kristian',
  age: 32
}

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

const options = {
  // logOn: true,
  prompt: fakePrompt, // inquirer.prompt,
  knownAnswers,
  on: {
    sectionAnswers(section: any, answers: any, options: any) {
      options.log('sectionAnswers', {
        section,
        answers
      })
    }
  }
}

describe('multiPrompt', () => {
  it('works', async () => {
    const answers = await multiPrompt(prompts, options)
    const keys = Object.keys(answers)
    // console.log({
    //   answers
    // })
    expect(typeof answers).toBe('object')
    expect(keys.length).toBeGreaterThan(0)
    expect(answers.type).toEqual('tiger')
  })
})
