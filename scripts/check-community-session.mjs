import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createCommunity} from '../apps/community-server/src/server.mjs';

export async function communityFixture(temp, dist, title) {
  const profile={id:randomUUID().replaceAll('-',''),name:'林间旅人'};
  const token=randomUUID(),password=randomUUID();
  const definition=JSON.parse(await fs.readFile('.runtime/community-extension.json','utf8'));
  const plugin=await fs.readFile(path.resolve('release',definition.version,'extensions',definition.name));
  let delivery='good',skinOffline=false,probeJar;

  let clientToken='';
  const skin=http.createServer(async(req,res)=>{
    const body=[];for await(const part of req)body.push(part);
    const input=body.length?JSON.parse(Buffer.concat(body)):{};let status=200,result={};
    if(req.url==='/downloads/community.zip'){
      if(delivery==='offline'){res.writeHead(503);res.end();return;}
      const data=delivery==='bad'?plugin.subarray(0,100):plugin;
      res.writeHead(200,{'Content-Type':'application/zip','Content-Length':data.length});res.end(data);return;
    }else if(skinOffline && req.url.startsWith('/authserver/')){
      status=503;result={error:'皮肤站暂时不可用'};
    }else if(req.url==='/artifact/latest.json'&&probeJar){
      result={checksums:{sha256:createHash('sha256').update(probeJar).digest('hex')},download_url:skinUrl+'/artifact/local.jar'};
    }else if(req.url==='/artifact/local.jar'&&probeJar){
      res.writeHead(200,{'Content-Type':'application/java-archive','Content-Length':probeJar.length});res.end(probeJar);return;
    }else if(req.url==='/authserver/authenticate'){
      if(input.username!=='test-player'||input.password!==password){status=403;result={error:'invalid login'};}
      else{clientToken=input.clientToken;result={accessToken:token,clientToken,selectedProfile:profile,availableProfiles:[profile]};}
    }else if(req.url==='/authserver/validate'||req.url==='/authserver/refresh'){
      if(input.accessToken!==token||input.clientToken!==clientToken){status=403;result={error:'invalid token'};}
      else if(req.url.endsWith('validate'))status=204;
      else result={accessToken:token,clientToken,selectedProfile:profile,availableProfiles:[profile]};
    }else status=404;
    res.writeHead(status,{'Content-Type':'application/json'});res.end(status===204?undefined:JSON.stringify(result));
  });
  skin.listen(0,'127.0.0.1');await once(skin,'listening');
  const skinUrl='http://127.0.0.1:'+skin.address().port;
  const service=createCommunity({data:path.join(temp,'server'),skin:skinUrl,adminIDs:[profile.id],origins:['http://tauri.localhost','https://tauri.localhost']});
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
  // Only redirect the skin service in a private test copy. The shipped files and the installed app stay independent.
  const bin=path.join(temp,'community-bin'),worker=path.join(bin,'engine');
  await fs.mkdir(worker,{recursive:true});await fs.copyFile(path.join(dist,title),path.join(bin,title));
  await fs.copyFile(path.join(dist,'engine/node.exe'),path.join(worker,'node.exe'));
  const code=await fs.readFile(path.join(dist,'engine/engine.cjs'),'utf8'),upstream='https://skin.hxzmc.top/api/yggdrasil';
  assert.ok(code.includes(upstream));assert.ok(code.includes(definition.url));await fs.writeFile(path.join(worker,'engine.cjs'),code.replaceAll(definition.url,skinUrl+'/downloads/community.zip').replaceAll(upstream,skinUrl).replaceAll('https://authlib-injector.yushi.moe/artifact/latest.json',skinUrl+'/artifact/latest.json'));
  return {
    url:'http://127.0.0.1:'+service.server.address().port,exe:path.join(bin,title),
    delivery(mode){delivery=mode;},skinOffline(value){skinOffline=value;},
    async login(page){
      const dialog=page.getByRole('dialog');
      await dialog.locator('input').first().fill('test-player');
      await dialog.locator('input[type=password]').fill('deliberately-wrong');
      await dialog.getByRole('button',{name:'登录幻想镇'}).click();
      await dialog.getByRole('alert').waitFor();
      await dialog.locator('input[type=password]').fill(password);
      await dialog.getByRole('button',{name:'登录幻想镇'}).click();
      await dialog.waitFor({state:'hidden',timeout:20000});
    },
    async exercise(page,capture){
      await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'社区',exact:true}).click();
      const nav=page.getByRole('navigation',{name:'社区导航'});
      await nav.getByRole('link',{name:'聊天'}).click();
      const chat=page.getByPlaceholder('聊点什么吧…');await chat.waitFor({timeout:25000});
      const text='周六的生存服见。';await chat.fill(text);await page.getByRole('button',{name:'发送消息'}).click();
      await page.getByText(text,{exact:true}).first().waitFor();await capture('community-chat');
      await nav.getByRole('link',{name:'论坛'}).click();
      await page.getByRole('button',{name:'发帖',exact:true}).click();
      const form=page.getByRole('dialog');await form.locator('input').fill('周末生存服集合');
      await form.locator('textarea').fill('我们在出生点集合，一起修一座桥。');await form.getByRole('button',{name:'发布话题'}).click();
      await page.getByText('周末生存服集合',{exact:true}).first().waitFor();
      await page.getByText('我们在出生点集合，一起修一座桥。',{exact:true}).first().waitFor();
      const reply=page.locator('main textarea').last();await reply.fill('我来准备木材。');await page.getByRole('button',{name:'发布回复',exact:true}).click();
      await page.getByText('我来准备木材。',{exact:true}).first().waitFor();
      await page.reload();await page.getByText('我来准备木材。',{exact:true}).first().waitFor({timeout:22000});await capture('community-forum');
      const more=nav.getByRole('combobox',{name:'更多社区功能'});
      await more.selectOption('/community/playtime');await page.getByRole('button',{name:'服务器在线',exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'服务器在线',exact:true}).getAttribute('aria-pressed'),'true');
      await page.getByRole('button',{name:'每周时长榜'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
      await more.selectOption('/community/wallet');await page.getByText('可用余额',{exact:true}).waitFor();
      await page.getByRole('link',{name:'我的背包',exact:true}).click();await page.getByRole('heading',{name:'我的背包',exact:true}).waitFor();
      await nav.getByRole('link',{name:'收件箱'}).click();await page.getByRole('button',{name:'全部已读'}).waitFor();
      await more.selectOption('/community/worlds');await page.getByRole('heading',{name:'世界与入服',exact:true}).waitFor();
      await nav.getByRole('link',{name:'语音房'}).click();await page.getByRole('heading',{name:'语音房',exact:true}).waitFor();
      await capture('community-voice');
      const session=await page.evaluate(()=>window.launcher.invoke('state',{localOnly:true}));assert.equal(session.value.accounts.find(a=>a.id===session.value.settings.selectedAccount)?.uuid,profile.id);
      const top=page.getByRole('navigation',{name:'主导航'});
      await top.getByRole('link',{name:'游戏库'}).click();await top.getByRole('link',{name:'社区',exact:true}).click();
      await page.getByText(text,{exact:true}).first().waitFor();
      const saved=await fs.readFile(path.join(temp,'accounts.bin'));assert.equal(saved.includes(Buffer.from(token)),false);
      assert.equal(saved.includes(Buffer.from(password)),false);
    },
    async prepareJava(gameRoot,id,javaPath){
      const dir=path.join(temp,'java-fixture');await fs.mkdir(dir,{recursive:true});
      const source='import java.nio.file.*; public class LocalClient { public static void premain(String args) {} public static void main(String[] args) throws Exception { Files.writeString(Path.of("client-started.txt"),String.join(" ", java.lang.management.ManagementFactory.getRuntimeMXBean().getInputArguments().stream().filter(v -> v.startsWith("-Xmx")).toList())+" "+Runtime.getRuntime().maxMemory()); System.out.println("LOCAL_CLIENT_READY"); Thread.sleep(60000); } }';
      await fs.writeFile(path.join(dir,'LocalClient.java'),source);await fs.writeFile(path.join(dir,'mf'),'Manifest-Version: 1.0\nPremain-Class: LocalClient\n\n');
      for(const [tool,args] of [['javac',['LocalClient.java']],['jar',['cfm','local.jar','mf','LocalClient.class']]]){
        const run=spawnSync(path.join(path.dirname(javaPath),tool+'.exe'),args,{cwd:dir,windowsHide:true,encoding:'utf8'});
        if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
      }
      probeJar=await fs.readFile(path.join(dir,'local.jar'));
      const instance=path.join(gameRoot,'versions',id),metadata=path.join(instance,id+'.json');
      const definition=JSON.parse(await fs.readFile(metadata,'utf8'));definition.mainClass='LocalClient';definition.arguments={game:[],jvm:[]};
      await fs.writeFile(metadata,JSON.stringify(definition));await fs.writeFile(path.join(instance,id+'.jar'),probeJar);
    },
    async close(){await service.close();await new Promise(r=>skin.close(r));}
  };
}
