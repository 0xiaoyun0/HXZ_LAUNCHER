import test from 'node:test';import assert from 'node:assert/strict';
import {imageBounds} from '../../community/image-bounds.mjs';
import {bilibiliVideo,bilibiliPlayer} from '../../../server/shared/bilibili.mjs';
test('raster dimensions are checked before allocating bitmaps',async()=>{
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(960,16);png.writeUInt32BE(640,20);assert.deepEqual(await imageBounds(new Blob([png])),{width:960,height:640});png.writeUInt32BE(1000000,16);await assert.rejects(imageBounds(new Blob([png])),/尺寸过大/);
 const jpeg=Buffer.from([255,216,255,192,0,8,8,2,128,3,192,1]);assert.deepEqual(await imageBounds(new Blob([jpeg])),{width:960,height:640});await assert.rejects(imageBounds(new Blob(['<svg/>'])),/无法读取/);
 const webp=Buffer.alloc(30);webp.write('RIFF',0);webp.write('WEBP',8);webp.write('VP8X',12);webp.writeUIntLE(959,24,3);webp.writeUIntLE(639,27,3);assert.deepEqual(await imageBounds(new Blob([webp])),{width:960,height:640});
});
test('Bilibili embeds use only official canonical video identifiers and bounded parameters',()=>{
 const a=bilibiliVideo('https://www.bilibili.com/video/BV1B7411m7LV/?p=2&share_source=copy_web');assert.equal(a.source,'https://www.bilibili.com/video/BV1B7411m7LV?p=2');assert.equal(a.page,2);assert.equal(bilibiliVideo('BV1B7411m7LV').key.bvid,'BV1B7411m7LV');assert.equal(bilibiliVideo('https://www.bilibili.com/video/av123').key.aid,'123');assert.equal(bilibiliVideo('https://www.bilibili.com/bangumi/play/ep123').key.episodeId,'123');
 const u=new URL(bilibiliPlayer(a.source,32.5,true));assert.equal(u.hostname,'player.bilibili.com');assert.equal(u.searchParams.get('t'),'32');assert.equal(u.searchParams.get('autoplay'),'1');
 for(const input of ['javascript:alert(1)','https://bilibili.com.evil/video/BV1B7411m7LV','https://www.bilibili.com@127.0.0.1/video/BV1B7411m7LV','https://www.bilibili.com/video/BV1B7411m7LV?p=NaN','https://www.bilibili.com/read/cv123'])assert.throws(()=>bilibiliVideo(input));
});
