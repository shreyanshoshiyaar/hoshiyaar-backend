import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '6387620131', type: 'signup', platform: 'web' })
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
  } catch (err) {
    console.error(err);
  }
}
test();
