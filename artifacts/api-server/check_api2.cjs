fetch('http://localhost:8081/api/purchases').then(r => r.json()).then(d => { const p = d.data.find(x => x.number === 'PUR-000001'); console.log(JSON.stringify(p, null, 2)); }).catch(console.error);
