async function test() {
  try {
    const res = await fetch('http://localhost:8081/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@albunyan.com', password: 'Admin@1234' })
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.text();
    console.log(`Body: ${data}`);
  } catch (err) {
    console.error(err);
  }
}

test();
