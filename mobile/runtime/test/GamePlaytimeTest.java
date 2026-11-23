import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import org.json.*;
import top.hxzmc.runtime.GamePlaytime;

public final class GamePlaytimeTest {
    private static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
    private static long time(String iso){return Instant.parse(iso).toEpochMilli();}
    private static File home(File base,String name)throws Exception {File home=new File(base,name);Files.createDirectories(home.toPath());return home;}
    private static long total(GamePlaytime p,long wall)throws Exception{return p.snapshot(wall).getLong("totalSeconds");}
    public static void main(String[] args)throws Exception {
        File base=new File(args[0]);long wall=time("2026-10-21T15:59:50Z");
        GamePlaytime p=new GamePlaytime(home(base,"midnight"));check(total(p,wall)==0,"preparation excluded");p.start(wall,0);p.stop(wall+30000,30000);
        JSONArray days=p.snapshot(wall+30000).getJSONArray("days");check(days.length()==2&&days.getJSONObject(0).getString("date").equals("2026-10-21")&&days.getJSONObject(0).getLong("seconds")==10&&days.getJSONObject(1).getLong("seconds")==20,"Beijing day split");
        File crash=home(base,"crash");p=new GamePlaytime(crash);p.start(wall,0);p.pulse(wall+30000,30000);
        GamePlaytime restart=new GamePlaytime(crash);wall+=12*3600000;check(total(restart,wall)==30,"crash gap excluded");restart.start(wall,0);restart.stop(wall+15000,15000);check(total(restart,wall+15000)==45,"restart counts fresh interval only");
        File concurrent=home(base,"parallel");GamePlaytime a=new GamePlaytime(concurrent),b=new GamePlaytime(concurrent);a.start(wall,0);b.start(wall+10000,0);a.pulse(wall+30000,30000);b.stop(wall+40000,30000);a.stop(wall+40000,40000);check(total(a,wall+40000)==40,"concurrent processes count union");
        p=new GamePlaytime(home(base,"rollback"));p.start(wall,0);p.pulse(wall+30000,30000);p.pulse(wall+10000,40000);p.pulse(wall+20000,50000);check(total(p,wall+20000)==30,"rollback cannot duplicate time");p.pulse(wall+30000,60000);p.pulse(wall+3630000,90000);check(total(p,wall+3630000)==60,"forward jump uses monotonic delta");p.stop(wall+8*3600000+3630000,8*3600000+90000);check(total(p,wall+8*3600000+3630000)==120,"suspend bounded to 60s");
        check(total(p,wall+366*86400000L)==0,"365 day retention");
        System.out.println("PASS Android playtime: midnight, crash, restart, concurrent union, rollback, forward jump, suspend, retention");
    }
}
