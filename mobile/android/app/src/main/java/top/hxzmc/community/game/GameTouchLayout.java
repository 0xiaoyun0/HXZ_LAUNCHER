package top.hxzmc.community.game;

import java.util.ArrayList;
import java.util.List;

/** Screen-space controls stay inside the viewport, including short landscape windows. */
final class GameTouchLayout {
    static final int EXIT=-1, PREVIOUS=-2, NEXT=-3, KEYBOARD=-4, DIAGNOSTICS=-5;
    static final class Item {
        final float x,y,width,height;final String label;final int key,button;
        Item(float x,float y,float width,float height,String label,int key,int button){this.x=x;this.y=y;this.width=width;this.height=height;this.label=label;this.key=key;this.button=button;}
    }
    final List<Item> items=new ArrayList<>();final float unit;
    GameTouchLayout(float width,float height,float desired){
        unit=Math.min(Math.max(1,desired),Math.min(width/9.5f,height/4f));
        if(width<=0||height<=0)return;
        float gap=unit*.12f,left=unit*.35f,bottom=height-unit*1.25f,top=unit*.25f;
        add(left+unit+gap,bottom-unit-gap,"↑",87,-1);add(left,bottom,"←",65,-1);add(left+unit+gap,bottom,"↓",83,-1);add(left+(unit+gap)*2,bottom,"→",68,-1);
        float right=width-unit*1.35f;add(right,bottom,"跳跃",32,-1);add(right-unit-gap,bottom,"放置",0,1);add(right,bottom-unit-gap,"攻击",0,0);
        add(left,top,"菜单",256,-1);add(left+unit+gap,top,"背包",69,-1);add(left+(unit+gap)*2,top,"潜行",340,-1);
        float exitLeft=width-unit*1.95f;
        items.add(new Item(exitLeft,top,unit*1.6f,unit,"返回社区",EXIT,-1));
        float availableStart=left+(unit+gap)*3,availableEnd=exitLeft-gap;
        float size=Math.min(unit,(availableEnd-availableStart-3*gap)/4);
        float start=availableStart+(availableEnd-availableStart-4*size-3*gap)/2;
        String[] labels={"上一格","下一格","键盘","日志"};int[] keys={PREVIOUS,NEXT,KEYBOARD,DIAGNOSTICS};
        for(int i=0;i<4;i++)items.add(new Item(start+i*(size+gap),top,size,unit,labels[i],keys[i],-1));
    }
    private void add(float x,float y,String label,int key,int button){items.add(new Item(x,y,unit,unit,label,key,button));}
}
