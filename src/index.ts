import * as inquirer from 'inquirer'

interface IPromptsDef {
  flow: string[]
  sections: any
}

function isFunction(value: any) {
  return typeof value === 'function'
}

function validate(sections: any, name: string, options: any) {
  const section = sections[name]
  if (!sections) {
    options.error(`Flow ${name} has no matching prompt section`, {
      sections,
      name
    })
  }
  if (!isFunction(section.prompt)) {
    options.error(`Section ${name} has no prompt function`, {
      sections,
      name
    })
  }
  return true
}

async function asyncReduce(array: any[], handler: Function, startingValue: any) {
  let result = startingValue;

  for (let value of array) {
    // `await` will transform result of the function to the promise,
    // even it is a synchronous call
    result = await handler(result, value);
  }

  return result;
}

function promptDefToArray(promptDef: any): any[] {
  return Array.isArray(promptDef) ? promptDef : [promptDef]
}

function promptNames(promptDefList: any[], options: any): string[] {
  return promptDefList.map(promptDef => {
    return promptDef.name
  })
}

/**
 * Create the prompts to ask for this section
 * @param opts
 */
async function createPromptsToAsk(opts: any) {
  const {
    section,
    accAnswers,
    knownAnswerNames,
    options,
    defaults
  } = opts

  const createPromptDef = section.prompt
  // createPromptDef can be a function or static object
  // TODO: validate createPromptDef

  const promptDef = isFunction(createPromptDef) ? await createPromptDef(accAnswers, options) : createPromptDef

  const promptDefList = defaults.promptDefToArray(promptDef, options)

  const questionsToAsk = defaults.promptNames(promptDefList, options)
  // filter with knownAnswers??
  const promptsToAsk = defaults.getPromptsToAsk(promptDefList, { exclude: knownAnswerNames }, options)
  options.log({
    promptsToAsk,
    knownAnswerNames,
    questionsToAsk,
    promptDefList
  })
  return promptsToAsk
}

function getPromptsToAsk(promptDefList: any[], filtering: any, options: any) {
  let {
    include,
    exclude
  } = filtering
  include = include || []
  exclude = exclude || []

  return promptDefList.filter(def => {
    const name: string = def.name
    const included = include.length === 0 || include.includes(name)
    const excluded = exclude.includes(name)
    const filterResult = included && !excluded
    options.log('filter', {
      promptDefList,
      include,
      exclude,
      name,
      included,
      excluded,
      filterResult
    })
    return filterResult
  })
}


function noop() { }

function error(msg: string, data: any) {
  data ? console.error(msg, data) : console.error(msg)
  throw new Error(msg)
}

function createLog(log: Function, options: any) {
  return function (msg: string, data: any) {
    if (options.logOn) {
      data ? log(msg, data) : log(msg)
    }
  }
}

const $defaults = {
  createLog,
  log: console.log,
  error,
  prompt: inquirer.prompt,
  promptNames,
  promptDefToArray,
  getPromptsToAsk,
  createPromptsToAsk,
  on: {
    sectionNew: noop,
    sectionCreated: noop,
    sectionAnswers: noop,
    promptedAnswers: noop
  }
}

async function doCallback(on: any, name: string, ...args: any[]) {
  const cb = on[name]
  await isFunction(cb) ? cb(...args) : noop()
}

function validPromptsToAsk(promptsToAsk: any, options: any) {
  const {
    error,
    warn
  } = options
  if (!Array.isArray(promptsToAsk)) {
    error(`promptsToAsk must be an Array, was: ${promptsToAsk}`, {
      promptsToAsk
    })
  }
  if (promptsToAsk.length === 0) {
    warn('promptsToAsk has no prompts')
  }
  return true
}


export async function multiPrompt(promptsDef: IPromptsDef, options: any) {
  const {
    flow
  } = promptsDef
  let {
    log,
    error,
    prompt,
    on,
    knownAnswers,
    defaults,
    createPromptsToAsk
  } = options
  defaults = defaults || $defaults
  prompt = prompt || defaults.prompt
  knownAnswers = knownAnswers || {}
  createPromptsToAsk = createPromptsToAsk || defaults.createPromptsToAsk
  log = log || defaults.log
  error = error || defaults.error
  options.error = error

  options.log = createLog(log, options)
  options.warn = options.warn || options.log
  log = options.log

  on = Object.keys($defaults.on).reduce((acc, name) => {
    const onFun = acc[name] || (defaults.on || {})[name] || ($defaults.on || {})[name]
    acc[name] = isFunction(onFun) ? onFun : noop
    return acc
  }, on)

  log({
    on
  })

  const knownAnswerNames: string[] = Object.keys(knownAnswers)

  flow.map(name => validate(promptsDef.sections, name, options))

  const answersPrompted = await asyncReduce(flow, async (accAnswers: any, name: string) => {
    const section = promptsDef.sections[name]
    log({
      section
    })

    await doCallback(on, 'sectionNew', section, options)

    const promptsToAsk = await createPromptsToAsk({
      section,
      accAnswers,
      knownAnswerNames,
      options,
      defaults
    })
    log({
      promptsToAsk
    })
    if (!validPromptsToAsk(promptsToAsk, options)) return accAnswers

    await doCallback(on, 'sectionCreated', section, promptsToAsk, options)
    log('prompt', { promptsToAsk, options })

    const answers = await prompt(promptsToAsk, options)
    await doCallback(on, 'sectionAnswers', section, answers, options)
    log({
      answers
    })

    return Object.assign(accAnswers, answers)
  }, knownAnswers)

  await doCallback(on, 'promptedAnswers', answersPrompted, options)

  // merge with known answers
  return Object.assign(answersPrompted, knownAnswers)
}
