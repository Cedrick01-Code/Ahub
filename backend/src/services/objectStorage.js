import { createHash, createHmac } from 'node:crypto';

const config = () => {
  const { S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new Error('Private object storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.');
  return { endpoint: new URL(S3_ENDPOINT), bucket: S3_BUCKET, region: S3_REGION, accessKey: S3_ACCESS_KEY_ID, secretKey: S3_SECRET_ACCESS_KEY };
};
const sha256 = value => createHash('sha256').update(value).digest('hex');
const hmac = (key, value, encoding) => createHmac('sha256', key).update(value).digest(encoding);
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const pathFor = (bucket, key) => `/${encode(bucket)}/${key.split('/').map(encode).join('/')}`;
const timestamp = date => date.toISOString().replace(/[:-]|.d{3}/g, '');
const signingKey = (secret, date, region) => hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');

export const signObjectUrl = ({ method, key, contentType, sha256sum, expiresIn = 300 }) => {
  const cfg = config();
  const now = new Date();
  const amzDate = timestamp(now);
  const date = amzDate.slice(0, 8);
  const host = cfg.endpoint.host;
  const canonicalUri = pathFor(cfg.bucket, key);
  const scope = `${date}/${cfg.region}/s3/aws4_request`;
  const signedHeaders = method === 'PUT' ? 'content-type;host;x-amz-meta-sha256' : 'host';
  const query = new URLSearchParams({ 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${cfg.accessKey}/${scope}`, 'X-Amz-Date': amzDate, 'X-Amz-Expires': String(expiresIn), 'X-Amz-SignedHeaders': signedHeaders });
  const canonicalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encode(k)}=${encode(v)}`).join('&');
  const canonicalHeaders = method === 'PUT' ? `content-type:${contentType.trim()}\nhost:${host}\nx-amz-meta-sha256:${sha256sum}\n` : `host:${host}\n`;
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
  query.set('X-Amz-Signature', hmac(signingKey(cfg.secretKey, date, cfg.region), stringToSign, 'hex'));
  const url = new URL(cfg.endpoint);
  url.pathname = canonicalUri;
  url.search = query.toString();
  return { url: url.toString(), headers: method === 'PUT' ? { 'Content-Type': contentType, 'x-amz-meta-sha256': sha256sum } : {} };
};

export const inspectStoredObject = async ({ key }) => {
  const cfg = config();
  const now = new Date(); const amzDate = timestamp(now); const date = amzDate.slice(0, 8);
  const host = cfg.endpoint.host; const canonicalUri = pathFor(cfg.bucket, key);
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `HEAD\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/${cfg.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
  const signature = hmac(signingKey(cfg.secretKey, date, cfg.region), stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`${cfg.endpoint.origin}${canonicalUri}`, { method: 'HEAD', headers: { 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, Authorization: authorization } });
  if (!response.ok) throw new Error(`Object storage did not confirm the uploaded file (${response.status}).`);
  return { size: Number(response.headers.get('content-length')), mimeType: response.headers.get('content-type') || '', sha256: response.headers.get('x-amz-meta-sha256') || '' };
};
