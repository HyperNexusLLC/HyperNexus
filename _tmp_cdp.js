const WS='ws://127.0.0.1:9222/devtools/page/79ACC9811DCA4E87E18C3A7F5DAE06D3'; 
const sock=new WebSocket(WS); 
sock.onopen=function(){sock.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'document.title + String.fromCharCode(124) + location.href'}}));}; 
sock.onmessage=function(ev){console.log(String(ev.data).slice(0,800));sock.close();}; 
sock.onerror=function(){console.log('WSERR');process.exit(1);}; 
setTimeout(function(){console.log('WSTIMEOUT');process.exit(1);},15000); 
