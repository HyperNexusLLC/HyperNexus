const http = require('http');
const content = '// hypernexus MCP configuration\n{\n  "mcpServers": {}\n}\n';
const data = JSON.stringify({ content });
const req = http.request({ host: '127.0.0.1', port: 7778, path: '/api/mcp/config/jsonc', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('update:', res.statusCode, b.substring(0, 300));
    // Read back
    http.get('http://127.0.0.1:7778/api/mcp/config/jsonc', r2 => {
      let b2 = '';
      r2.on('data', c => b2 += c);
      r2.on('end', () => console.log('read:', r2.statusCode, b2.substring(0, 300)));
    });
  });
});
req.write(data);
req.end();
