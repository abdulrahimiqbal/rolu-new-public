import ImageKit from 'imagekit';

if (!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
}
if (!process.env.IMAGEKIT_PRIVATE_KEY) {
  throw new Error('Missing environment variable: IMAGEKIT_PRIVATE_KEY');
}
if (!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');
}

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
});

export default imagekit; 