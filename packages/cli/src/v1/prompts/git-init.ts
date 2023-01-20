import {ui} from '@shopify/cli-kit';

export const gitInit = async (): Promise<boolean> => {
  const question: ui.Question = {
    type: 'select',
    name: 'initialize',
    message:
      "Git version control hasn't been initialized for this directory. Do you want to do that now?",
    choices: [
      {name: 'Yes', value: 'yes'},
      {name: 'No', value: 'no'},
    ],
    default: 'yes',
  };

  const promptResults = await ui.prompt([question]);

  return promptResults.initialize === 'yes';
};
