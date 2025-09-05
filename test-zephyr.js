const crypto = require('crypto');
const fs = require('fs');

// Test different approaches to match Java implementation
function testZephyrSigning() {
  const secret =
    'VWL+fjdkgf4X3LJwuCauJa5CfLn3+bWeo9FKvc+CecN+yJth19S/smNTMqqdFsXvIvyoTP2vkgf7TenjbhS2PeHPSew95OKZuDGJO4NWUkXiaQiOHEtrgteQNWpoDd0lUqeDhTw4tm6THzeO4CvailelK6tOitjiR+ypSRaDuZSSuG5iq+pq0wWThUPilEg=';
  const timestamp = Date.now();

  // Test 1: Original approach
  const payload1 = {
    secret: secret,
    timestamp: timestamp,
  };

  // Test 2: Java-like order
  const payload2 = {};
  payload2.secret = secret;
  payload2.timestamp = timestamp;

  console.log('Payload 1:', JSON.stringify(payload1));
  console.log('Payload 2:', JSON.stringify(payload2));

  const privateKeyPem = fs.readFileSync('./zephyr.pem', 'utf8');

  [payload1, payload2].forEach((payload, index) => {
    try {
      const signStr = JSON.stringify(payload);
      console.log(`\nTest ${index + 1}:`);
      console.log('String to encrypt:', signStr);

      const encrypted = crypto.privateEncrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(signStr, 'utf8'),
      );

      const token = encrypted.toString('base64');
      console.log('Token:', token.substring(0, 50) + '...');
      console.log('Token length:', token.length);
    } catch (error) {
      console.error(`Test ${index + 1} failed:`, error.message);
    }
  });
}

testZephyrSigning();
