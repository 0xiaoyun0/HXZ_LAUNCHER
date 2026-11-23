package top.hxzmc.runtime;

import java.io.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.json.*;

/** Personal calendar, never a trusted server counter. Only observed heartbeats are committed. */
public final class GamePlaytime {
    private static final long DAY=86400000L, OFFSET=28800000L;
    private static final Object PROCESS_LOCK=new Object();
    private final File file,lock;
    private boolean active;private long previousWall,previousMono;
    public GamePlaytime(File communityFiles)throws IOException {
        File home=communityFiles.toPath().toRealPath().toFile();
        file=RuntimeFiles.inside(home,"game-playtime.json");lock=RuntimeFiles.inside(home,"game-playtime.lock");
    }
    private static String date(long millis){return Instant.ofEpochMilli(millis).atOffset(ZoneOffset.ofHours(8)).toLocalDate().toString();}
    public synchronized void start(long wall,long mono){if(!active){active=true;previousWall=wall;previousMono=mono;}}
    public synchronized void pulse(long wall,long mono)throws Exception {
        if(!active)return;
        long elapsed=Math.max(0,Math.min(60000,Math.min(mono-previousMono,wall-previousWall)));
        previousWall=wall;previousMono=mono;
        synchronized(PROCESS_LOCK){RuntimeFiles.noLinks(lock);try(RandomAccessFile raf=new RandomAccessFile(lock,"rw");FileLock ignored=raf.getChannel().lock()){
            JSONObject state=read(),days=prune(state,wall);long through=state.optLong("through"),start=Math.max(wall-elapsed,through);
            if(wall>start){while(start<wall){long end=Math.min(wall,(Math.floorDiv(start+OFFSET,DAY)+1)*DAY-OFFSET);String day=date(start);days.put(day,Math.min(DAY,days.optLong(day)+end-start));start=end;}
                state.put("through",Math.max(through,wall)).put("updated",wall);
            }
            RuntimeFiles.writeJson(file,state);
        }}
    }
    public synchronized void stop(long wall,long mono)throws Exception {if(!active)return;try{pulse(wall,mono);}finally{active=false;}}
    private JSONObject read()throws Exception {
        RuntimeFiles.noLinks(file);if(!file.exists())return new JSONObject().put("version",1).put("days",new JSONObject());
        if(file.length()>65536)throw new IOException("游玩日历文件过大");
        JSONObject state=RuntimeFiles.json(file),days=state.optJSONObject("days");
        if(state.optInt("version")!=1||days==null||days.length()>365)throw new IOException("游玩日历格式无效");return state;
    }
    private JSONObject prune(JSONObject state,long now)throws Exception {
        now=Math.max(now,state.optLong("through"));JSONObject days=state.getJSONObject("days"),next=new JSONObject();String first=date(now-364*DAY),last=date(now);
        Iterator<String> keys=days.keys();while(keys.hasNext()){String key=keys.next();long ms=days.optLong(key);
            if(key.matches("\\d{4}-\\d{2}-\\d{2}")&&key.compareTo(first)>=0&&key.compareTo(last)<=0&&ms>0)next.put(key,Math.min(DAY,ms));
        }state.put("days",next);return next;
    }
    public JSONObject snapshot(long now)throws Exception {
        synchronized(PROCESS_LOCK){RuntimeFiles.noLinks(lock);try(RandomAccessFile raf=new RandomAccessFile(lock,"rw");FileLock ignored=raf.getChannel().lock()){
            JSONObject state=read(),days=prune(state,now);List<String> dates=new ArrayList<>();Iterator<String> keys=days.keys();while(keys.hasNext())dates.add(keys.next());Collections.sort(dates);
            JSONArray result=new JSONArray();long total=0;for(String day:dates){long seconds=days.getLong(day)/1000;if(seconds>0){total+=seconds;result.put(new JSONObject().put("date",day).put("seconds",seconds));}}
            return new JSONObject().put("timezone","Asia/Shanghai").put("days",result).put("totalSeconds",total).put("activeDays",result.length()).put("updated",state.optLong("updated"));
        }}
    }
}
