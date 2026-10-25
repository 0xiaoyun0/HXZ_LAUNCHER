package up.hxz;
import com.google.gson.JsonObject;
final class Progress {
    static final ThreadLocal<java.util.function.Consumer<String>> output=new ThreadLocal<>();
    private final java.util.function.Consumer<String> report;
    Progress(JsonObject config,Network network){report=output.get()==null?s->{}:output.get();}
    void phase(String text){report.accept(text);}void show(String text){phase(text);}void begin(long bytes,int files){phase("正在同步整合包 · "+files+" 个文件");}
    void progress(int done,int total,String path){phase("同步 "+done+" / "+total+" · "+path);}
    void gameVersion(String s){}String platformMessage(){return "";}boolean confirmForce(String s){return false;}
    void close(){}void complete(JsonObject logs){}void summary(String s){phase(s);}void error(String s){phase("更新未完成，原文件已保留");}
}
