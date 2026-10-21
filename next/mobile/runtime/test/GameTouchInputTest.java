package top.hxzmc.community.game;

import java.util.*;

public final class GameTouchInputTest {
    private static int checks;
    private static void check(boolean ok,String message){checks++;if(!ok)throw new AssertionError(message);}
    public static void main(String[] args){
        if(args.length==3){GameTouchLayout layout=new GameTouchLayout(Integer.parseInt(args[0]),Integer.parseInt(args[1]),Float.parseFloat(args[2]));StringJoiner rows=new StringJoiner(",","[","]");for(GameTouchLayout.Item item:layout.items)rows.add(String.format(Locale.ROOT,"{\"x\":%f,\"y\":%f,\"width\":%f,\"height\":%f,\"label\":\"%s\"}",item.x,item.y,item.width,item.height,item.label));System.out.println(rows);return;}
        for(int[] viewport:new int[][]{{320,180},{640,360},{740,280},{800,360},{1280,720},{1600,2560},{2560,1600}})for(float size:new float[]{33.6f,48,72,144,216}){
            GameTouchLayout layout=new GameTouchLayout(viewport[0],viewport[1],size);
            Set<Integer> actions=new HashSet<>();
            for(GameTouchLayout.Item item:layout.items){
                check(item.width>0&&item.height>0&&item.x>=0&&item.y>=0&&item.x+item.width<=viewport[0]+.01f&&item.y+item.height<=viewport[1]+.01f,"Control outside screen: "+item.label);
                actions.add(item.key);
                for(GameTouchLayout.Item other:layout.items)if(item!=other)check(item.x+item.width<=other.x+.01f||other.x+other.width<=item.x+.01f||item.y+item.height<=other.y+.01f||other.y+other.height<=item.y+.01f,"Controls overlap: "+item.label+" / "+other.label);
            }
            check(actions.containsAll(Arrays.asList(GameTouchLayout.KEYBOARD,GameTouchLayout.EXIT,GameTouchLayout.PREVIOUS,GameTouchLayout.NEXT,32,69,256)),"Required control missing");
        }
        List<Integer> result=new ArrayList<>();GameTextInput.send("你好 😀 /spawn",result::add);check(result.equals(Arrays.asList(20320,22909,32,128512,32,47,115,112,97,119,110)),"Unicode must use complete code points");
        result.clear();GameTextInput.send("a\n\r\t\0\u007fb\ud800c",result::add);check(result.equals(Arrays.asList(97,98,99)),"Control characters or lone surrogate leaked");
        result.clear();GameTextInput.send("a".repeat(600),result::add);check(result.size()==256,"Input can exhaust native queue");
        result.clear();GameTextInput.send("😀".repeat(300),result::add);check(result.size()==256&&result.stream().allMatch(n->n==128512),"Unicode limit counts partial characters");
        System.out.println("PASS "+checks+" touch/input assertions; geometry and Unicode only, no device interaction");
    }
}
