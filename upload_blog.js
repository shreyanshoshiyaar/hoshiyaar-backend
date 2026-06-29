const https = require('https');

const data = JSON.stringify({ phone: '7021970672', password: 'Sb@12345678' });

const options = {
  hostname: 'api.hoshiyaar.info',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const parsed = JSON.parse(body);
    const token = parsed.token;
    if (token) {
       console.log("Logged in successfully, got token.");
       const blogContent = `
<h2>What Is a Clinical Thermometer?</h2>
<p>A clinical thermometer is used to measure the <em>temperature of the human body</em>. Its range is <em>35°C to 42°C</em>.</p>
<p>Doctors and nurses use clinical thermometers to check if a patient has a fever. The word "clinical" comes from "clinic" — a place of medical care.</p>
<h3>Features of a clinical thermometer:</h3>
<ul>
  <li><strong>Range:</strong> 35°C to 42°C (94°F to 108°F)</li>
  <li><strong>Has a kink</strong> just above the bulb — prevents mercury from falling back</li>
  <li><strong>Mercury bulb</strong> — placed under the tongue or in the armpit</li>
  <li><strong>Smaller and portable</strong> — designed for regular use outside a lab</li>
  <li><strong>Must be jerked downward</strong> before each use to reset the mercury</li>
  <li><strong>Can be read after removal</strong> from the patient's body — because the kink holds the reading</li>
</ul>

<h2>What Is a Laboratory Thermometer?</h2>
<p>A laboratory thermometer is used to measure temperature in <em>science experiments</em>. Its range is <em>−10°C to 110°C</em>.</p>
<p>Laboratory thermometers are used in science labs to measure the temperature of liquids, gases, or solids during experiments.</p>
<h3>Features of a laboratory thermometer:</h3>
<ul>
  <li><strong>Range:</strong> −10°C to 110°C — much wider than a clinical thermometer</li>
  <li><strong>No kink</strong> — mercury falls back as soon as it is removed from the substance</li>
  <li><strong>Must be read while still in the substance</strong> — because there is no kink to hold the reading</li>
  <li><strong>Longer than a clinical thermometer</strong></li>
  <li><strong>Held upright</strong> during measurement</li>
  <li><strong>Bulb must be fully submerged</strong> in the liquid being measured</li>
</ul>

<h2>Clinical vs Laboratory Thermometer — Comparison Table</h2>
<table>
  <thead><tr><th>Feature</th><th>Clinical Thermometer</th><th>Laboratory Thermometer</th></tr></thead>
  <tbody>
    <tr><td><strong>Purpose</strong></td><td>Measuring human body temperature</td><td>Measuring temperature in experiments</td></tr>
    <tr><td><strong>Range</strong></td><td>35°C to 42°C</td><td>−10°C to 110°C</td></tr>
    <tr><td><strong>Kink</strong></td><td>✅ Yes — just above the bulb</td><td>❌ No kink</td></tr>
    <tr><td><strong>Reading after removal</strong></td><td>✅ Yes — kink holds mercury in place</td><td>❌ No — mercury falls back immediately</td></tr>
    <tr><td><strong>Jerking before use</strong></td><td>✅ Yes — to reset mercury below 35°C</td><td>❌ Not needed</td></tr>
    <tr><td><strong>Position during use</strong></td><td>Under tongue or in armpit</td><td>Bulb submerged in liquid, held upright</td></tr>
    <tr><td><strong>Size</strong></td><td>Smaller, portable</td><td>Longer</td></tr>
    <tr><td><strong>Used by</strong></td><td>Doctors, patients, households</td><td>Scientists, students in lab</td></tr>
  </tbody>
</table>

<h2>The Kink — Explained in Detail</h2>
<p>A <strong>kink</strong> is a small bend or constriction in the glass tube of a clinical thermometer, located just above the bulb. Here is exactly what it does:</p>
<ol>
  <li>You place the thermometer under the tongue. As the body temperature heats the bulb, mercury expands and rises up the tube past the kink.</li>
  <li>You remove the thermometer from the mouth. Normally, mercury would contract and fall back into the bulb — the reading would disappear.</li>
  <li>The kink prevents this. It stops mercury from flowing back down. The column of mercury stays in place above the kink.</li>
  <li>You can now read the temperature clearly, even though the thermometer is no longer in contact with the body.</li>
</ol>
<p>💡 A laboratory thermometer has <strong>no kink</strong>. This is why you must read it while the bulb is still inside the liquid — the moment you remove it, mercury falls back and the reading is lost.</p>

<h2>Why Can't You Use a Laboratory Thermometer for Body Temperature?</h2>
<ol>
  <li><strong>No kink:</strong> A laboratory thermometer has no kink, so mercury falls back immediately when you remove it from the mouth. You cannot read the temperature.</li>
  <li><strong>Wrong range:</strong> A laboratory thermometer is not calibrated with precision for the narrow 35°C–42°C body temperature range. Its wide range makes it far less accurate for detecting small changes in body temperature.</li>
</ol>
<p>⚠️ <strong>Common mistake:</strong> "We can use any thermometer to measure body temperature." — This is wrong. Only a clinical thermometer should be used for measuring body temperature.</p>

<h2>How to Use Each Thermometer Correctly</h2>
<h3>Clinical thermometer — step by step:</h3>
<ol>
  <li>Wash and wipe the thermometer clean with antiseptic.</li>
  <li>Jerk it downward to bring mercury level below 35°C.</li>
  <li>Place the bulb under the tongue (or in armpit). Keep mouth closed.</li>
  <li>Wait 1–2 minutes.</li>
  <li>Remove and read at eye level.</li>
  <li>Record the temperature, then wash and store safely.</li>
</ol>
<h3>Laboratory thermometer — step by step:</h3>
<ol>
  <li>Hold the thermometer upright by the upper end — never by the bulb.</li>
  <li>Submerge the bulb fully into the liquid being measured.</li>
  <li>Wait for the mercury to stabilise.</li>
  <li>Read the temperature at eye level while the thermometer is still in the liquid.</li>
  <li>Remove carefully and store safely.</li>
</ol>
       `;

       const blogData = JSON.stringify({
         title: 'Clinical Thermometer vs Laboratory Thermometer | Class 6 CBSE',
         category: 'Science',
         content: blogContent,
         author: 'Hoshi',
         slug: 'clinical-vs-laboratory-thermometer',
         published: true
       });

       const createOpts = {
         hostname: 'api.hoshiyaar.info',
         path: '/api/blogs', 
         method: 'POST',
         headers: { 
           'Authorization': 'Bearer ' + token,
           'Content-Type': 'application/json',
           'Content-Length': Buffer.byteLength(blogData)
         }
       };

       const req2 = https.request(createOpts, res2 => {
         let body2 = '';
         res2.on('data', d => body2 += d);
         res2.on('end', () => console.log('Create Blog response:', body2));
       });
       req2.write(blogData);
       req2.end();
    } else {
       console.log('No token received');
    }
  });
});
req.on('error', e => console.error(e));
req.write(data);
req.end();
