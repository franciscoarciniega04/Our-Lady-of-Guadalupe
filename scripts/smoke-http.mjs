import assert from 'node:assert/strict';
const base=process.argv[2];
if(!base||!/^https?:\/\//.test(base))throw Error('Usage: node scripts/smoke-http.mjs http://localhost:5173');
const production=process.argv.includes('--production');
const routes=['/','/horarios','/avisos','/videos','/cursos','/parroquia','/contacto','/cuenta','/verificar','/privacidad','/terminos','/admin'];
for(const route of routes){
 const r=await fetch(new URL(route,base));assert.equal(r.status,200,route);
 assert.equal(r.headers.get('x-content-type-options'),'nosniff',route);
 assert.equal(r.headers.get('x-frame-options'),'DENY',route);
 const csp=r.headers.get('content-security-policy');assert.ok(csp?.includes("object-src 'none'"),route);
 if(production){assert.ok(r.headers.get('strict-transport-security')?.includes('max-age=31536000'),route);assert.ok(!csp.includes('unsafe-eval'),route);}
 const html=await r.text();assert.ok(html.includes('Our Lady of Guadalupe'),route);
 console.log(`OK ${route}: página y cabeceras`);
}
for(const path of ['/api/account','/api/admin/payments','/api/admin/profiles','/api/courses/11111111-1111-4111-8111-111111111111/content']){
 const r=await fetch(new URL(path,base));assert.equal(r.status,401,path);assert.match(r.headers.get('cache-control')??'',/no-store/);console.log(`OK ${path}: acceso anónimo rechazado`);
}
const csrf=await fetch(new URL('/api/auth/login',base),{method:'POST',headers:{origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);console.log('OK: solicitud de origen ajeno rechazada');
console.log('Pruebas HTTP completadas. No se registraron usuarios ni se iniciaron pagos.');
