import { config } from './config-basics';

import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: config.openai_secret_key,
    organization: 'org-Qu9dwMovXds0qg4a6xSCcoIb',
    project: 'proj_PY7YkeABbcoxbvkss9PE8dVr'
});

export default openai;