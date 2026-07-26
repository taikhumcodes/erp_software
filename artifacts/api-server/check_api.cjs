fetch('http://localhost:3000/api/purchases').then(r => r.json()).then(d => console.log(JSON.stringify(d.data.find(p => p.number === \'PUR-000001\'), null, 2)))
