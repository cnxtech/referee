import express from 'express';
import proxy from 'express-http-proxy';
import util from 'util';
import Optional from 'optional-js';
import path from 'path';
import { publicRoot } from './const/appPaths';

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.redirect(301, '/dashboard'));

app.use(
  '/kayenta',
  proxy(Optional.ofNullable(process.env.KAYENTA_BASE_URL).orElse('http://localhost:8090'), {
    proxyReqOptDecorator: (proxyReqOpts: any) => {
      // Hook for self signed certs https://www.npmjs.com/package/express-http-proxy#q-how-to-ignore-self-signed-certificates-
      proxyReqOpts.rejectUnauthorized = !!process.env.DISABLE_KAYENTA_SSL_VERIFICATION;
      return proxyReqOpts;
    },
    proxyReqPathResolver: req => {
      return process.env.KAYENTA_BASE_PATH ? `${process.env.KAYENTA_BASE_PATH}${req.url}` : req.url;
    }
  })
);

app.get('/health', (req, res) => {
  res.status(204).end();
});

// Route all other traffic to the public dir
app.use(
  '/dashboard/',
  express.static(publicRoot, {
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        // All of the project's HTML files end in .html
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

// Wild card route needed for React Router to support deep linking.
app.get('/dashboard/*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(publicRoot, '/index.html'), err => {
    if (err) {
      res.status(500).send(util.inspect(err));
    }
  });
});

app.listen(port, () => console.log(`Referee listening on port ${port}!`));
