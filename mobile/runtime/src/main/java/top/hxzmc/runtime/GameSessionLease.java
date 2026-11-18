package top.hxzmc.runtime;

/** Accessed under the account lock. A dead game cannot pin authentication indefinitely. */
public final class GameSessionLease {
    private String id="";private long deadline;
    public boolean active(long now){return !id.isEmpty()&&now<deadline;}
    public String id(){return id;}
    public long deadline(){return deadline;}
    public void restore(String saved,long until,long now){
        restore(saved,until,now,null);
    }
    public void restore(String saved,long until,long now,Boolean ownerAlive){
        clear();if(saved==null||!saved.matches("[a-zA-Z0-9-]{16,64}")||Boolean.FALSE.equals(ownerAlive))return;
        if(Boolean.TRUE.equals(ownerAlive)){id=saved;deadline=now+90000;}
        else if(until>now&&until-now<=90000){id=saved;deadline=until;}
    }
    /** Known process state wins over a heartbeat missed during process recreation. Unknown stays bounded. */
    public boolean reconcile(Boolean ownerAlive,long now){
        if(id.isEmpty())return false;
        if(Boolean.TRUE.equals(ownerAlive)){deadline=now+90000;return false;}
        if(Boolean.FALSE.equals(ownerAlive)||now>=deadline){clear();return true;}
        return false;
    }
    public void begin(String next,long now) {
        if(next==null||!next.matches("[a-zA-Z0-9-]{16,64}"))throw new IllegalArgumentException("Invalid game session");
        if(active(now)&&!id.equals(next))throw new IllegalStateException("已有游戏正在运行，请先退出后再启动");
        id=next;deadline=now+90000;
    }
    public boolean pulse(String expected,long now){if(!active(now)||!id.equals(expected))return false;deadline=now+90000;return true;}
    public void end(String expected){if(id.equals(expected)){id="";deadline=0;}}
    public void clear(){id="";deadline=0;}
}
