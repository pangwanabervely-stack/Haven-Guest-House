import serverless from 'serverless-http';
import { createExpressApp } from '../../server';

const app = createExpressApp();

export const handler = serverless(app);
