// Local Gemini contract simulator. Uses synthetic data and test credentials only.
const http = require('http');
http.createServer((req,res)=>{
 if(req.method!=='POST'||new URL(req.url,'http://localhost').pathname!=='/v1beta/models/gemini-3.8-flash:generateContent'){res.writeHead(501);return res.end();}
 let raw='';req.on('data',chunk=>raw+=chunk);req.on('end',()=>{
  try {
   const input=JSON.parse(raw), context=JSON.parse(input.contents[0].parts[0].text);
   if(!new URL(req.url,'http://localhost').searchParams.get('key')||input.generationConfig.thinkingConfig.thinkingLevel!=='low'){res.writeHead(400);return res.end('{}');}
   const status=context.name==='RATE_LIMIT'?429:context.name==='UNAVAILABLE'?503:200;
   res.writeHead(status,{'Content-Type':'application/json'});
   if(status!==200)return res.end(JSON.stringify({error:{code:status}}));
   if(context.name==='MALFORMED')return res.end('{}');
   const subtasks=input.systemInstruction.parts[0].text.includes('Suggest at most');
   const result=subtasks?{subtasks:[{name:'Verify release',description:'Check acceptance criteria'}]}:{text:'Generated task summary'};
   res.end(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]}));
  }catch{res.writeHead(400);res.end('{}');}
 });
}).listen(process.env.PORT||4500);
