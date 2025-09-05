const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');

async function testZephyrAuth() {
  const secret =
    'VWL+fjdkgf4X3LJwuCauJa5CfLn3+bWeo9FKvc+CecN+yJth19S/smNTMqqdFsXvIvyoTP2vkgf7TenjbhS2PeHPSew95OKZuDGJO4NWUkXiaQiOHEtrgteQNWpoDd0lUqeDhTw4tm6THzeO4CvailelK6tOitjiR+ypSRaDuZSSuG5iq+pq0wWThUPilEg=';
  const licenseKey = '7337ace8f52a4490b8317dc8e9c6dfc1';
  const baseURL = 'https://dev-sandbox-v423.zephyrcards.com';

  const timestamp = Date.now();

  // Try different payload formats
  const payloads = [
    // Format 1: Basic
    {
      secret: secret,
      timestamp: timestamp,
    },
    // Format 2: With childUserId
    {
      secret: secret,
      childUserId: 'TEST_USER_ID',
      timestamp: timestamp,
    },
    // Format 3: Different order (Java-like)
    (() => {
      const obj = {};
      obj.secret = secret;
      obj.timestamp = timestamp;
      return obj;
    })(),
  ];

  const privateKeyPem = fs.readFileSync('./zephyr.pem', 'utf8');

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const signStr = JSON.stringify(payload);

    console.log(`\n=== Test ${i + 1} ===`);
    console.log('Payload:', signStr);
    console.log('Length:', signStr.length);

    try {
      // Try different approaches
      const approaches = [
        // 1. Original privateEncrypt with PKCS1
        () => {
          const encrypted = crypto.privateEncrypt(
            {
              key: privateKeyPem,
              padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(signStr, 'utf8'),
          );
          return encrypted.toString('base64');
        },

        // 2. Sign with SHA256
        () => {
          const signature = crypto.sign(
            'sha256',
            Buffer.from(signStr, 'utf8'),
            {
              key: privateKeyPem,
              padding: crypto.constants.RSA_PKCS1_PADDING,
            },
          );
          return signature.toString('base64');
        },

        // 3. Sign with SHA1 (older approach)
        () => {
          const signature = crypto.sign('sha1', Buffer.from(signStr, 'utf8'), {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          });
          return signature.toString('base64');
        },
      ];

      for (let j = 0; j < approaches.length; j++) {
        try {
          const token = approaches[j]();
          console.log(`Approach ${j + 1} token: ${token.substring(0, 30)}...`);

          // Test with API
          try {
            const response = await axios.get(
              `${baseURL}/open-api/authorization/verification`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-LICENSE': licenseKey,
                  'Content-Type': 'application/json',
                },
                timeout: 5000,
              },
            );

            console.log(`Approach ${j + 1} SUCCESS:`, response.data);
            return; // Exit if successful
          } catch (apiError) {
            if (apiError.response) {
              console.log(
                `Approach ${j + 1} API Error:`,
                apiError.response.data,
              );
            } else {
              console.log(`Approach ${j + 1} Network Error:`, apiError.message);
            }
          }
        } catch (cryptoError) {
          console.log(`Approach ${j + 1} Crypto Error:`, cryptoError.message);
        }
      }
    } catch (error) {
      console.error(`Test ${i + 1} failed:`, error.message);
    }
  }
}

testZephyrAuth();
