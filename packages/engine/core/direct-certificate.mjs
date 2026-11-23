import {generateKeyPair,X509Certificate} from 'node:crypto';
import selfsigned from 'selfsigned';
import {certificateFingerprint} from './direct-wire.mjs';

// Keys live only for this room and never enter the directory or settings.
export async function createRoomCertificate(){
 const keyPair=await new Promise((resolve,reject)=>generateKeyPair('rsa',{
  modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}
 },(error,publicKey,privateKey)=>error?reject(error):resolve({publicKey,privateKey})));
 const pem=selfsigned.generate([{name:'commonName',value:'FantasyTown Direct Room'}],{
  keyPair,algorithm:'sha256',days:2,notBeforeDate:new Date(Date.now()-300000),
  extensions:[{name:'basicConstraints',cA:false},{name:'keyUsage',digitalSignature:true,keyEncipherment:true},{name:'extKeyUsage',serverAuth:true}]
 });
 return {key:pem.private,cert:pem.cert,fingerprint:certificateFingerprint(new X509Certificate(pem.cert).raw)};
}
