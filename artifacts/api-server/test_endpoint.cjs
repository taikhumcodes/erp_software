async function run() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: 'cmryumm640006f9jdujy55npf' }, 'replace_me_with_a_long_random_string_for_access_tokens', { expiresIn: '1d' });
  const res = await fetch('http://localhost:8081/api/delivery-orders?limit=100&invoiceStatus=NOT_INVOICED', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(await res.json());
}
run();
