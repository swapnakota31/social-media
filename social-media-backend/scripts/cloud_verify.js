require('dotenv').config();
const https = require('https');

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;

if (!cloud || !key || !secret) {
  console.error('Missing Cloudinary env values');
  process.exit(2);
}

const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
const options = {
  hostname: 'api.cloudinary.com',
  path: `/v1_1/${cloud}/resources/image?max_results=1`,
  method: 'GET',
  headers: {
    Authorization: auth,
    'User-Agent': 'cloud-verify-script'
  }
};

const req = https.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log('BODY', body.slice(0, 200));
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('ERR', e && e.message);
  process.exit(1);
});

req.end();
