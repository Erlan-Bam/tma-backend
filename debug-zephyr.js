const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');

async function debugZephyrAuth() {
  console.log('=== Debugging Zephyr Authentication ===\n');

  // Test with minimal payload first
  const secret =
    'VWL+fjdkgf4X3LJwuCauJa5CfLn3+bWeo9FKvc+CecN+yJth19S/smNTMqqdFsXvIvyoTP2vkgf7TenjbhS2PeHPSew95OKZuDGJO4NWUkXiaQiOHEtrgteQNWpoDd0lUqeDhTw4tm6THzeO4CvailelK6tOitjiR+ypSRaDuZSSuG5iq+pq0wWThUPilEg=';
  const licenseKey = '7337ace8f52a4490b8317dc8e9c6dfc1';
  const baseURL = 'https://dev-sandbox-v423.zephyrcards.com';

  // Test 1: Try with a much simpler payload
  console.log('Test 1: Simple payload');
  const simplePayload = {
    secret: 'test',
    timestamp: Date.now(),
  };

  const privateKeyPem = fs.readFileSync('./zephyr.pem', 'utf8');

  try {
    const signStr = JSON.stringify(simplePayload);
    console.log('Simple payload string:', signStr);

    const encrypted = crypto.privateEncrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(signStr, 'utf8'),
    );

    const token = encrypted.toString('base64');
    console.log('Simple token:', token.substring(0, 50) + '...');

    const response = await axios.get(
      `${baseURL}/open-api/authorization/verification`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-LICENSE': licenseKey,
        },
        timeout: 5000,
      },
    );

    console.log('Simple payload result:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Simple payload API error:', error.response.data);
    } else {
      console.log('Simple payload error:', error.message);
    }
  }

  // Test 2: Try different authorization header formats
  console.log('\nTest 2: Different auth header formats');
  const payload = {
    secret: secret,
    timestamp: Date.now(),
  };

  const signStr = JSON.stringify(payload);
  const signature = crypto.sign('sha256', Buffer.from(signStr, 'utf8'), {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  });
  const token = signature.toString('base64');

  const authFormats = [
    `Bearer ${token}`,
    `${token}`,
    `RSA-SHA256 ${token}`,
    `Zephyr ${token}`,
  ];

  for (let i = 0; i < authFormats.length; i++) {
    try {
      console.log(
        `Trying auth format ${i + 1}: ${authFormats[i].substring(0, 30)}...`,
      );

      const response = await axios.get(
        `${baseURL}/open-api/authorization/verification`,
        {
          headers: {
            Authorization: authFormats[i],
            'X-LICENSE': licenseKey,
          },
          timeout: 5000,
        },
      );

      console.log(`Auth format ${i + 1} SUCCESS:`, response.data);
      return;
    } catch (error) {
      if (error.response) {
        console.log(`Auth format ${i + 1} error:`, error.response.data);
      } else {
        console.log(`Auth format ${i + 1} network error:`, error.message);
      }
    }
  }

  // Test 3: Try POST instead of GET
  console.log('\nTest 3: POST request');
  try {
    const response = await axios.post(
      `${baseURL}/open-api/authorization/verification`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-LICENSE': licenseKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      },
    );

    console.log('POST result:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('POST error:', error.response.data);
    } else {
      console.log('POST network error:', error.message);
    }
  }
}

debugZephyrAuth();
