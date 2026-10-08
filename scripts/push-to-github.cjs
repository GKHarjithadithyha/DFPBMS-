const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

async function push() {
  const dir = path.resolve(__dirname, '..');
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    process.exit(1);
  }

  console.log('Pushing repository to https://github.com/GKHarjithadithyha/dhavanam-finance-erp.git (branch: main)...');
  
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => ({
      username: token,
      password: '',
    }),
    force: false,
  });

  console.log('Push response:', JSON.stringify(pushResult, null, 2));
  console.log('Successfully pushed to GitHub!');
}

push().catch(err => {
  console.error('Push failed:', err);
  process.exit(1);
});
