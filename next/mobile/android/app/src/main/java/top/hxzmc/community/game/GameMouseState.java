package top.hxzmc.community.game;

/** Tracks Android button masks so MotionEvent and emulated key events share edges. */
final class GameMouseState {
    interface Output {void button(int button,boolean pressed);}
    private int buttons,motionButtons,keyButtons;
    void snapshot(int next,Output output){
        motionButtons=next&31;
        publish(output);
    }
    private void publish(Output output){
        int next=motionButtons|keyButtons;
        int changed=buttons^next;
        for(int button=0;button<5;button++){
            int mask=1<<button;
            if((changed&mask)!=0)output.button(button,(next&mask)!=0);
        }
        buttons=next;
    }
    void edge(int button,boolean down,Output output){
        if(button<0||button>=5)return;
        int mask=1<<button;
        keyButtons=down?keyButtons|mask:keyButtons&~mask;
        publish(output);
    }
    void release(Output output){motionButtons=keyButtons=0;publish(output);}
    static int coordinate(float point,int viewSize,int renderSize){
        if(viewSize<=0||renderSize<=0||!Float.isFinite(point))return 0;
        return (int)(Math.max(0,Math.min(1,point/viewSize))*renderSize*1000);
    }
}
