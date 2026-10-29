const WS='ws://127.0.0.1:9222/devtools/page/79ACC9811DCA4E87E18C3A7F5DAE06D3'; 
const sock=new WebSocket(WS); 
const EX='var a=document.querySelectorAll(String.fromCharCode(116,101,120,116,97,114,101,97));var o=[];for(var i=0;i<a.length;i++){o.push(a[i].tagName+String.fromCharCode(35)+a[i].id+String.fromCharCode(58)+a[i].placeholder)}a.length+String.fromCharCode(47)+o.join();'; 
sock.onopen=function(){sock.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:EX}}));}; 
sock.onmessage=function(ev){console.log(String(ev.data).slice(0,1500));sock.close();}; 
sock.onerror=function(){console.log('WSERR');process.exit(1);}; 
setTimeout(function(){console.log('WSTIMEOUT');process.exit(1);},15000); 
