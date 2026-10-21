package top.hxzmc.community.game;

public final class GamePointerGestureTest {
    private static int checks;
    private static void check(boolean condition,String message){checks++;if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){
        GamePointerGesture slow=new GamePointerGesture(100,100,8,false);
        for(int step=1;step<=30;step++)slow.update(100+step,100,false);
        check(!slow.canClick(),"Thirty one-pixel moves must not click on release");
        slow.update(100,100,false);check(!slow.canClick(),"Dragging back to origin must not restore tap");
        GamePointerGesture up=new GamePointerGesture(100,100,8,false);
        up.update(130,100,false);check(!up.canClick(),"UP position must detect movement without MOVE");
        GamePointerGesture tap=new GamePointerGesture(100,100,8,false);
        tap.update(103,104,false);check(tap.canClick(),"Small finger jitter should still click");
        check(tap.x==103&&tap.y==104,"Latest point must support relative movement");
        GamePointerGesture world=new GamePointerGesture(0,0,8,true);
        world.update(0,0,false);check(!world.canClick(),"Releasing capture during gesture must not click menu");
        GamePointerGesture changed=new GamePointerGesture(0,0,8,false);
        check(changed.update(20,30,true),"Mode switch must request re-anchoring before sending delta");
        check(!changed.update(21,31,true)&&changed.x==21&&changed.y==31,"Next frame must use the new anchor");
        changed.update(0,0,false);
        check(!changed.canClick(),"Capture round trip must not restore tap");
        GamePointerGesture diagonal=new GamePointerGesture(0,0,8,false);
        diagonal.update(6,6,false);check(!diagonal.canClick(),"Tap slop must include both axes");
        System.out.println("PASS "+checks+" pointer gesture replay assertions");
    }
}
