async function run() {
  try {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'cmryumm640006f9jdujy55npf' }, 'replace_me_with_a_long_random_string_for_access_tokens', { expiresIn: '1d' });

    const res = await fetch('http://localhost:8081/api/delivery-orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        customerId: 'cmrywnsjl0007gf0fgb5wsjdu',
        orderType: 'DIRECT',
        deliveryDate: new Date().toISOString(),
        items: [{
          productId: 'cmrywkrg90004gf0fi4gbdxbo',
          quantity: '50'
        }]
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
run();
