import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareLaunch} from '../src-electron/core/minecraft.mjs';
import {writeJSON} from '../src-electron/core/io.mjs';
const exec=promisify(execFile),jdk='C:/Program Files/Java/jdk-21/bin/';
test('real Java agent and classpath survive a Unicode instance directory; new UI/language defaults preserve existing options',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-中文路径-')),root=path.join(temp,'幻想镇 游戏'),id='模组二服';t.after(()=>fs.rm(temp,{recursive:true,force:true}));
 await fs.writeFile(path.join(temp,'Probe.java'),'public class Probe { public static void premain(String arg) { System.setProperty("probe.agent","ok"); } public static void main(String[] args) { if (!"ok".equals(System.getProperty("probe.agent"))) throw new RuntimeException("agent missing"); System.out.println("UNICODE_AGENT_OK"); } }');
 await fs.writeFile(path.join(temp,'MANIFEST.MF'),'Manifest-Version: 1.0\nPremain-Class: Probe\n\n');
 await exec(jdk+'javac.exe',['--release','8','-d',temp,path.join(temp,'Probe.java')],{windowsHide:true});
 const agent=path.join(temp,'中文 登录组件.jar');await exec(jdk+'jar.exe',['cfm',agent,path.join(temp,'MANIFEST.MF'),'-C',temp,'Probe.class'],{windowsHide:true});
 await writeJSON(path.join(root,'versions',id,id+'.json'),{id,javaVersion:{majorVersion:8},mainClass:'Probe',libraries:[],arguments:{jvm:['-cp','${classpath}'],game:[]}});
 await fs.copyFile(agent,path.join(root,'versions',id,id+'.jar'));
 for(const java of [jdk+'java.exe','C:/Program Files/Java/zulu8.78.0.19-ca-jdk8.0.412-win_x64/bin/java.exe']){
  const command=await prepareLaunch({root,id,java,settings:{memoryMB:512},account:{name:'Fixture',uuid:'12345678123456781234567812345678',accessToken:'dummy'},authAgent:agent});
  assert.ok(command.args.includes('-javaagent:.hxzl/authlib-injector.jar=https://skin.hxzmc.top/api/yggdrasil'));
  const {stdout}=await exec(command.command,command.args,{cwd:command.cwd,windowsHide:true,timeout:15000});assert.match(stdout,/UNICODE_AGENT_OK/);
 }
 const options=path.join(root,'versions',id,'options.txt');assert.match(await fs.readFile(options,'utf8'),/guiScale:2\nlang:zh_cn/);
 await fs.writeFile(options,'guiScale:3\nlang:en_us\n');await prepareLaunch({root,id,java:jdk+'java.exe',settings:{},account:{name:'F',uuid:'1',accessToken:'x'},authAgent:agent});assert.equal(await fs.readFile(options,'utf8'),'guiScale:3\nlang:en_us\n');
});
